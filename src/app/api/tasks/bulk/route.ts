import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { completeTodoistTask } from "@/lib/integrations/todoist"

const bulkSchema = z.object({
  action: z.enum(["complete", "hide"]),
  ids: z.array(z.string().min(1)).min(1).max(50),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { action: bodyAction, ids } = parsed.data

  if (bodyAction === "complete") {
    // Fetch tasks to determine which are Todoist (need write-back)
    const rows = await db
      .select({ id: tasks.id, source: tasks.source, sourceId: tasks.sourceId })
      .from(tasks)
      .where(and(eq(tasks.userId, session.user.id), inArray(tasks.id, ids)))

    // Mark all complete in DB
    await db
      .update(tasks)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(and(eq(tasks.userId, session.user.id), inArray(tasks.id, ids)))

    // Write-back to Todoist for todoist-sourced tasks (best-effort)
    const todoistRows = rows.filter((r) => r.source === "todoist" && r.sourceId)
    if (todoistRows.length > 0) {
      await Promise.allSettled(
        todoistRows.map((r) => completeTodoistTask(session.user.id, r.sourceId!)),
      )
    }
  } else {
    await db
      .update(tasks)
      .set({ isHidden: true, updatedAt: sql`(unixepoch())` })
      .where(and(eq(tasks.userId, session.user.id), inArray(tasks.id, ids)))
  }

  return NextResponse.json({ ok: true, processed: ids.length })
}
