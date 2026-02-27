import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { completeTodoistTask } from "@/lib/integrations/todoist"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const rows = await db
    .select({ id: tasks.id, source: tasks.source, sourceId: tasks.sourceId })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)))
    .limit(1)

  const task = rows[0]
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Mark complete in DB
  await db
    .update(tasks)
    .set({ isCompleted: true, completedAt: new Date() })
    .where(eq(tasks.id, id))

  // If Todoist task, close it in Todoist too
  if (task.source === "todoist" && task.sourceId) {
    try {
      await completeTodoistTask(session.user.id, task.sourceId)
    } catch {
      // Best-effort — task is already marked done locally
    }
  }

  return NextResponse.json({ ok: true })
}
