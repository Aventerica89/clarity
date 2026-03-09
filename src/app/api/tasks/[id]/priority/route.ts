import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { updateTodoistTask } from "@/lib/integrations/todoist"

function toTodoistPriority(priorityManual: number): number {
  const map: Record<number, number> = { 5: 4, 4: 3, 3: 2, 1: 1 }
  return map[priorityManual] ?? 1
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
  const body = (await request.json()) as { priority?: number }
  const nextPriority = body.priority

  if (nextPriority === undefined || ![1, 3, 4, 5].includes(nextPriority)) {
    return NextResponse.json({ error: "Valid priority required (1,3,4,5)" }, { status: 400 })
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
    .set({ priorityManual: nextPriority, updatedAt: new Date() })
    .where(eq(tasks.id, id))

  if (task.source === "todoist" && task.sourceId) {
    try {
      await updateTodoistTask(session.user.id, task.sourceId, {
        priority: toTodoistPriority(nextPriority),
      })
    } catch {
      // Best-effort — DB is already updated
    }
  }

  return NextResponse.json({ ok: true, priority: nextPriority })
}
