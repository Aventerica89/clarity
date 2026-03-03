import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { completeTodoistTask } from "@/lib/integrations/todoist"

interface BulkBody {
  action: "complete" | "hide"
  ids: string[]
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as BulkBody
  if (!body.action || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "action and ids required" }, { status: 400 })
  }

  // Limit bulk ops to 50 at a time
  const ids = body.ids.slice(0, 50)

  if (body.action === "complete") {
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
