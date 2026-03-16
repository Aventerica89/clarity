import { NextRequest, NextResponse } from "next/server"
import { and, eq, desc, asc, sql } from "drizzle-orm"
import { z } from "zod"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import {
  createTodoistTaskWithSubtasks,
  upsertTodoistTask,
  fetchTodoistTaskById,
} from "@/lib/integrations/todoist"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get("status") ?? "active"
  const source = searchParams.get("source") ?? "all"
  const priority = searchParams.get("priority") ?? "all"
  const dateFilter = searchParams.get("dateFilter") ?? "all"
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix" }).format(new Date())

  const conditions = [eq(tasks.userId, session.user.id)]

  if (status === "active") {
    conditions.push(eq(tasks.isCompleted, false))
    conditions.push(eq(tasks.isHidden, false))
  } else if (status === "completed") {
    conditions.push(eq(tasks.isCompleted, true))
  } else if (status === "hidden") {
    conditions.push(eq(tasks.isHidden, true))
    conditions.push(eq(tasks.isCompleted, false))
  }

  if (source !== "all") {
    conditions.push(eq(tasks.source, source))
  }

  if (priority !== "all") {
    const p = parseInt(priority, 10)
    if (!isNaN(p)) {
      conditions.push(eq(tasks.priorityManual, p))
    }
  }

  if (dateFilter === "today") {
    conditions.push(eq(tasks.dueDate, today))
  } else if (dateFilter === "week") {
    const d = new Date()
    const dayOfWeek = d.getDay()
    const daysUntilSunday = 7 - dayOfWeek
    const endOfWeek = new Date(d)
    endOfWeek.setDate(d.getDate() + daysUntilSunday)
    const endOfWeekStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix" }).format(endOfWeek)
    conditions.push(sql`${tasks.dueDate} <= ${endOfWeekStr}`)
    conditions.push(sql`${tasks.dueDate} IS NOT NULL`)
  } else if (dateFilter === "overdue") {
    conditions.push(sql`${tasks.dueDate} < ${today}`)
    conditions.push(sql`${tasks.dueDate} IS NOT NULL`)
  }

  const rows = await db
    .select({
      id: tasks.id,
      source: tasks.source,
      sourceId: tasks.sourceId,
      title: tasks.title,
      description: tasks.description,
      dueDate: tasks.dueDate,
      dueTime: tasks.dueTime,
      priorityScore: tasks.priorityScore,
      priorityManual: tasks.priorityManual,
      isCompleted: tasks.isCompleted,
      isHidden: tasks.isHidden,
      triaged: tasks.triaged,
      labels: tasks.labels,
      metadata: tasks.metadata,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(...conditions))
    .orderBy(
      asc(sql`CASE WHEN ${tasks.dueDate} IS NULL THEN 1 ELSE 0 END`),
      asc(tasks.dueDate),
      desc(tasks.priorityManual),
    )
    .limit(200)

  const items = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }))

  return NextResponse.json({ tasks: items })
}

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  projectId: z.string().max(100).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.number().int().min(1).max(4).optional(),
  subtasks: z.array(z.string().min(1).max(500)).max(20).optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const body = parsed.data

  // If a Todoist project is selected, create in Todoist first then sync to DB
  if (body.projectId) {
    const result = await createTodoistTaskWithSubtasks(session.user.id, {
      title: body.title,
      projectId: body.projectId,
      dueDate: body.dueDate,
      subtasks: body.subtasks ?? [],
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Fetch the created task from Todoist to get full data, then upsert to DB
    try {
      const { getTodoistIntegrationRow } = await import("@/lib/integrations/todoist")
      const { decryptToken } = await import("@/lib/crypto")
      const row = await getTodoistIntegrationRow(session.user.id)
      if (row?.accessTokenEncrypted) {
        const token = decryptToken(row.accessTokenEncrypted)
        const todoistTask = await fetchTodoistTaskById(token, result.taskId)
        if (todoistTask) {
          await upsertTodoistTask(session.user.id, todoistTask)
          // User explicitly created this task — mark it triaged so it shows immediately
          await db
            .update(tasks)
            .set({ triaged: true })
            .where(
              and(
                eq(tasks.userId, session.user.id),
                eq(tasks.source, "todoist"),
                eq(tasks.sourceId, result.taskId),
              ),
            )
        }
      }
    } catch {
      // Best-effort DB sync — task exists in Todoist
    }

    return NextResponse.json({ ok: true, taskId: result.taskId })
  }

  // Manual task — insert directly into DB
  const [row] = await db
    .insert(tasks)
    .values({
      userId: session.user.id,
      source: "manual",
      title: body.title.trim(),
      dueDate: body.dueDate ?? null,
      priorityManual: body.priority ?? 1,
      triaged: true,
      labels: "[]",
      metadata: "{}",
    })
    .returning({ id: tasks.id })

  return NextResponse.json({ ok: true, taskId: row.id })
}
