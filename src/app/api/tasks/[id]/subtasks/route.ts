import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import {
  fetchTodoistSubtasks,
  addTodoistSubtask,
} from "@/lib/integrations/todoist"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const rows = await db
    .select({
      id: tasks.id,
      source: tasks.source,
      sourceId: tasks.sourceId,
    })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)))
    .limit(1)

  const task = rows[0]
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Fetch subtasks from Todoist if applicable
  if (task.source === "todoist" && task.sourceId) {
    const todoistSubtasks = await fetchTodoistSubtasks(
      session.user.id,
      task.sourceId,
    )

    const subtasks = todoistSubtasks.map((t) => ({
      id: t.id,
      content: t.content,
      isCompleted: t.is_completed,
      source: "todoist" as const,
    }))

    return NextResponse.json({ subtasks })
  }

  // For non-todoist tasks, no subtask support yet
  return NextResponse.json({ subtasks: [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json()) as { content: string }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 })
  }

  const rows = await db
    .select({
      id: tasks.id,
      source: tasks.source,
      sourceId: tasks.sourceId,
      metadata: tasks.metadata,
    })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)))
    .limit(1)

  const task = rows[0]
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (task.source === "todoist" && task.sourceId) {
    let projectId: string | undefined
    try {
      const meta = JSON.parse(task.metadata) as Record<string, unknown>
      projectId = meta.projectId as string | undefined
    } catch {
      // ignore parse errors
    }

    const result = await addTodoistSubtask(
      session.user.id,
      task.sourceId,
      body.content.trim(),
      projectId,
    )

    if (!result) {
      return NextResponse.json({ error: "Failed to add subtask" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      subtask: {
        id: result.id,
        content: body.content.trim(),
        isCompleted: false,
        source: "todoist",
      },
    })
  }

  return NextResponse.json(
    { error: "Subtasks only supported for Todoist tasks" },
    { status: 400 },
  )
}
