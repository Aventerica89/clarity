import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { triageQueue, tasks, lifeContextItems } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { getTodoistIntegrationRow } from "@/lib/integrations/todoist"
import { decryptToken } from "@/lib/crypto"

type Action = "approve" | "dismiss" | "push_to_context" | "complete"

const TODOIST_REST = "https://api.todoist.com/rest/v2"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as { action: Action }

  const rows = await db
    .select()
    .from(triageQueue)
    .where(and(eq(triageQueue.id, id), eq(triageQueue.userId, session.user.id)))
    .limit(1)

  const item = rows[0]
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (body.action === "approve") {
    await db
      .update(tasks)
      .set({ triaged: true })
      .where(
        and(
          eq(tasks.source, item.source),
          eq(tasks.sourceId, item.sourceId),
          eq(tasks.userId, session.user.id)
        )
      )

    await db.delete(triageQueue).where(eq(triageQueue.id, id))

    return NextResponse.json({ ok: true })
  }

  if (body.action === "dismiss") {
    await db.update(triageQueue)
      .set({ status: "dismissed", reviewedAt: new Date() })
      .where(eq(triageQueue.id, id))
    return NextResponse.json({ ok: true })
  }

  if (body.action === "push_to_context") {
    await db.update(triageQueue)
      .set({ status: "pushed_to_context", reviewedAt: new Date() })
      .where(eq(triageQueue.id, id))

    await db.insert(lifeContextItems).values({
      userId: session.user.id,
      title: item.title,
      description: item.snippet,
      urgency: item.aiScore >= 80 ? "critical" : "active",
    })

    return NextResponse.json({ ok: true })
  }

  if (body.action === "complete") {
    await db.update(triageQueue)
      .set({ status: "dismissed", reviewedAt: new Date() })
      .where(eq(triageQueue.id, id))

    // Close task in Todoist if it's a Todoist item
    if (item.source === "todoist" && item.sourceId) {
      try {
        const row = await getTodoistIntegrationRow(session.user.id)
        if (row?.accessTokenEncrypted) {
          const token = decryptToken(row.accessTokenEncrypted)
          await fetch(`${TODOIST_REST}/tasks/${item.sourceId}/close`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          })
        }
      } catch {
        // Best-effort — item is already dismissed locally
      }
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
