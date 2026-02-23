import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { integrations, tasks } from "@/lib/schema"
import { decryptToken, encryptToken } from "@/lib/crypto"

const TODOIST_BASE = "https://api.todoist.com/api/v1"
const TODOIST_SYNC = "https://api.todoist.com/sync/v9"

interface TodoistTask {
  id: string
  content: string
  description?: string
  due?: {
    date: string
    datetime?: string
    timezone?: string
  }
  priority: number // 1=normal, 2=high, 3=very high, 4=urgent
  labels: string[]
  is_completed: boolean
}

interface SaveTokenOptions {
  providerAccountId?: string
  config?: Record<string, unknown>
}

// Todoist priority 4 = urgent (maps to our 5), 1 = normal (our 1)
function mapPriority(todoistPriority: number): number {
  const map: Record<number, number> = { 4: 5, 3: 4, 2: 3, 1: 1 }
  return map[todoistPriority] ?? 1
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

async function fetchTodoistTasks(token: string): Promise<TodoistTask[]> {
  const res = await fetch(`${TODOIST_BASE}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Todoist API error: ${res.status} ${res.statusText}`)
  }
  // API v1 returns paginated shape: { results: TodoistTask[], next_cursor: string | null }
  const data = (await res.json()) as { results: TodoistTask[] } | TodoistTask[]
  return Array.isArray(data) ? data : data.results
}

export async function fetchTodoistTaskById(
  token: string,
  taskId: string,
): Promise<TodoistTask | null> {
  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Todoist API error: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as TodoistTask
}

export async function upsertTodoistTask(
  userId: string,
  t: TodoistTask,
): Promise<void> {
  if (t.is_completed) return

  const dueDate = t.due?.date ?? null
  const dueTime = t.due?.datetime
    ? t.due.datetime.substring(11, 19) // HH:MM:SS
    : null

  await db
    .insert(tasks)
    .values({
      userId,
      source: "todoist",
      sourceId: t.id,
      title: t.content,
      description: t.description ?? null,
      dueDate,
      dueTime,
      priorityManual: mapPriority(t.priority),
      labels: JSON.stringify(t.labels),
      metadata: JSON.stringify({ todoistPriority: t.priority }),
    })
    .onConflictDoUpdate({
      target: [tasks.userId, tasks.source, tasks.sourceId],
      set: {
        title: t.content,
        description: t.description ?? null,
        dueDate,
        dueTime,
        priorityManual: mapPriority(t.priority),
        labels: JSON.stringify(t.labels),
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

  let rawTasks: TodoistTask[]
  try {
    rawTasks = await fetchTodoistTasks(token)
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

  // Delete all synced Todoist tasks for this user
  await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.source, "todoist")))

  // Delete the integration row
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

  const res = await fetch(`${TODOIST_BASE}/tasks/${taskId}/close`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Todoist close error: ${res.status}`)
  }
}

export async function getTodoistIntegrationRow(userId: string) {
  return getTodoistRow(userId)
}

// Fetch Todoist user profile for OAuth connect flow
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
  const data = (await res.json()) as { id: string; email: string; full_name: string }
  return data
}
