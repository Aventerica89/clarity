import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { updateTodoistTask } from "@/lib/integrations/todoist"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json()) as { dueDate: string }

  if (!body.dueDate) {
    return NextResponse.json({ error: "dueDate required" }, { status: 400 })
  }

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

  await db
    .update(tasks)
    .set({ dueDate: body.dueDate, updatedAt: new Date() })
    .where(eq(tasks.id, id))

  if (task.source === "todoist" && task.sourceId) {
    try {
      await updateTodoistTask(session.user.id, task.sourceId, {
        due_date: body.dueDate,
      })
    } catch {
      // Best-effort — DB is already updated
    }
  }

  return NextResponse.json({ ok: true })
}
