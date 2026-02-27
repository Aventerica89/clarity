import { TodoistApi, type Task } from "@doist/todoist-api-typescript"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { integrations, tasks } from "@/lib/schema"
import { decryptToken, encryptToken } from "@/lib/crypto"

const TODOIST_SYNC = "https://api.todoist.com/sync/v9"

interface SaveTokenOptions {
  providerAccountId?: string
  config?: Record<string, unknown>
}

// Todoist priority 4 = urgent (maps to our 5), 1 = normal (our 1)
function mapPriority(todoistPriority: number): number {
  const map: Record<number, number> = { 4: 5, 3: 4, 2: 3, 1: 1 }
  return map[todoistPriority] ?? 1
}

function makeApi(token: string): TodoistApi {
  return new TodoistApi(token)
}

async function getTodoistRow(userId: string) {
  const rows = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.userId, userId), eq(integrations.provider, "todoist")),
    )
    .limit(1)
  return rows[0] ?? null
}

async function getTodoistToken(userId: string): Promise<string | null> {
  const row = await getTodoistRow(userId)
  if (!row?.accessTokenEncrypted) return null
  return decryptToken(row.accessTokenEncrypted)
}

async function fetchAllTasks(api: TodoistApi): Promise<Task[]> {
  const all: Task[] = []
  let cursor: string | null = null

  do {
    const response = await api.getTasks({ cursor, limit: 200 })
    all.push(...response.results)
    cursor = response.nextCursor
  } while (cursor !== null)

  return all
}

export async function fetchTodoistTaskById(
  token: string,
  taskId: string,
): Promise<Task | null> {
  try {
    return await makeApi(token).getTask(taskId)
  } catch {
    return null
  }
}

export async function upsertTodoistTask(
  userId: string,
  t: Task,
): Promise<void> {
  if (t.checked) return

  const dueDate = t.due?.date ?? null
  const dueTime = t.due?.datetime ? t.due.datetime.substring(11, 19) : null

  const metadata = JSON.stringify({
    todoistPriority: t.priority,
    projectId: t.projectId,
    ...(t.sectionId ? { sectionId: t.sectionId } : {}),
    ...(t.parentId ? { parentId: t.parentId } : {}),
    url: t.url,
    isRecurring: t.due?.isRecurring ?? false,
    ...(t.duration ? { duration: t.duration } : {}),
    ...(t.deadline ? { deadline: t.deadline.date } : {}),
    ...(t.addedAt ? { addedAt: t.addedAt } : {}),
  })

  await db
    .insert(tasks)
    .values({
      userId,
      source: "todoist",
      sourceId: t.id,
      title: t.content,
      description: t.description || null,
      dueDate,
      dueTime,
      priorityManual: mapPriority(t.priority),
      labels: JSON.stringify(t.labels),
      metadata,
    })
    .onConflictDoUpdate({
      target: [tasks.userId, tasks.source, tasks.sourceId],
      set: {
        title: t.content,
        description: t.description || null,
        dueDate,
        dueTime,
        priorityManual: mapPriority(t.priority),
        labels: JSON.stringify(t.labels),
        metadata,
        updatedAt: new Date(),
      },
    })
}

export async function syncTodoistTasks(userId: string): Promise<{
  synced: number
  error?: string
}> {
  const token = await getTodoistToken(userId)
  if (!token) {
    return { synced: 0, error: "Todoist not connected" }
  }

  let rawTasks: Task[]
  try {
    rawTasks = await fetchAllTasks(makeApi(token))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    await db
      .update(integrations)
      .set({ syncStatus: "error", lastError: msg, lastSyncedAt: new Date() })
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, "todoist"),
        ),
      )
    return { synced: 0, error: msg }
  }

  let synced = 0
  for (const t of rawTasks) {
    await upsertTodoistTask(userId, t)
    synced++
  }

  await db
    .update(integrations)
    .set({ syncStatus: "ok", lastSyncedAt: new Date(), lastError: null })
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, "todoist"),
      ),
    )

  return { synced }
}

export async function saveTodoistToken(
  userId: string,
  token: string,
  options: SaveTokenOptions = {},
): Promise<void> {
  const encrypted = encryptToken(token)
  const configJson = JSON.stringify(options.config ?? {})
  await db
    .insert(integrations)
    .values({
      userId,
      provider: "todoist",
      accessTokenEncrypted: encrypted,
      syncStatus: "idle",
      providerAccountId: options.providerAccountId ?? null,
      config: configJson,
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: {
        accessTokenEncrypted: encrypted,
        syncStatus: "idle",
        lastError: null,
        providerAccountId: options.providerAccountId ?? null,
        config: configJson,
      },
    })
}

export async function deleteTodoistToken(userId: string): Promise<void> {
  // Attempt to revoke token at Todoist (best effort)
  try {
    const token = await getTodoistToken(userId)
    if (token) {
      const clientId = process.env.TODOIST_CLIENT_ID
      const clientSecret = process.env.TODOIST_CLIENT_SECRET
      if (clientId && clientSecret) {
        await fetch("https://todoist.com/oauth/revoke_token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            access_token: token,
          }),
        })
      }
    }
  } catch {
    // Revocation failure is non-fatal — always proceed with local cleanup
  }

  await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.source, "todoist")))

  await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.provider, "todoist"),
      ),
    )
}

export async function completeTodoistTask(
  userId: string,
  taskId: string,
): Promise<void> {
  const token = await getTodoistToken(userId)
  if (!token) throw new Error("Todoist not connected")
  await makeApi(token).closeTask(taskId)
}

export async function getTodoistIntegrationRow(userId: string) {
  return getTodoistRow(userId)
}

// Fetch Todoist user profile — uses Sync API v9 (not covered by SDK)
export async function fetchTodoistUserProfile(token: string): Promise<{
  id: string
  email: string
  full_name: string
}> {
  const res = await fetch(`${TODOIST_SYNC}/user`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Todoist profile error: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as { id: string; email: string; full_name: string }
}

// ── Task mutations ───────────────────────────────────────────────────────────

export async function updateTodoistTask(
  userId: string,
  taskId: string,
  updates: {
    dueString?: string
    content?: string
    priority?: number
    labels?: string[]
    description?: string
    deadlineDate?: string | null
  },
): Promise<void> {
  const token = await getTodoistToken(userId)
  if (!token) throw new Error("Todoist not connected")
  await makeApi(token).updateTask(taskId, updates)
}

export async function fetchTodoistSubtasks(
  userId: string,
  parentId: string,
): Promise<Task[]> {
  const token = await getTodoistToken(userId)
  if (!token) return []

  try {
    const response = await makeApi(token).getTasks({ parentId })
    return response.results
  } catch {
    return []
  }
}

export async function addTodoistSubtask(
  userId: string,
  parentId: string,
  content: string,
  projectId?: string,
): Promise<{ id: string } | null> {
  const token = await getTodoistToken(userId)
  if (!token) return null

  try {
    const task = await makeApi(token).addTask({
      content,
      parentId,
      ...(projectId ? { projectId } : {}),
    })
    return { id: task.id }
  } catch {
    return null
  }
}

// ── Triage: Projects + Task creation with subtasks ───────────────────────────

export interface TodoistProject {
  id: string
  name: string
  color: string
}

export async function fetchTodoistProjects(userId: string): Promise<{
  projects: TodoistProject[]
  error?: string
}> {
  const token = await getTodoistToken(userId)
  if (!token) return { projects: [], error: "Todoist not connected" }

  try {
    const response = await makeApi(token).getProjects()
    const projects: TodoistProject[] = response.results.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
    }))
    return { projects }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { projects: [], error: msg }
  }
}

export async function createTodoistTaskWithSubtasks(
  userId: string,
  input: {
    title: string
    projectId: string
    dueDate?: string
    subtasks: string[]
  },
): Promise<{ taskId: string; error?: string }> {
  const token = await getTodoistToken(userId)
  if (!token) return { taskId: "", error: "Todoist not connected" }

  const api = makeApi(token)

  let parent: Task
  try {
    parent = await api.addTask({
      content: input.title,
      projectId: input.projectId,
      ...(input.dueDate ? { dueString: input.dueDate } : {}),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create task"
    return { taskId: "", error: msg }
  }

  for (const subtask of input.subtasks) {
    try {
      await api.addTask({
        content: subtask,
        projectId: input.projectId,
        parentId: parent.id,
      })
    } catch {
      // Best-effort — continue creating remaining subtasks
    }
  }

  return { taskId: parent.id }
}
