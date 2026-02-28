import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems, lifeContextUpdates } from "@/lib/schema"

const editSchema = z.object({
  content: z.string().min(1).max(20000),
  severity: z.enum(["monitoring", "active", "escalated", "critical", "resolved"]),
})

const actionSchema = z.object({
  action: z.enum(["approve", "dismiss"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; updateId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { updateId } = await params
  const body: unknown = await request.json()

  // Handle approve/dismiss of a proposed urgency change
  const actionParsed = actionSchema.safeParse(body)
  if (actionParsed.success) {
    const [current] = await db
      .select()
      .from(lifeContextUpdates)
      .where(and(
        eq(lifeContextUpdates.id, updateId),
        eq(lifeContextUpdates.userId, session.user.id),
      ))
      .limit(1)

    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (actionParsed.data.action === "approve") {
      if (current.proposedUrgency) {
        // Apply the proposed urgency change to the parent item
        await db
          .update(lifeContextItems)
          .set({ urgency: current.proposedUrgency })
          .where(eq(lifeContextItems.id, current.contextItemId))
      }

      const [updated] = await db
        .update(lifeContextUpdates)
        .set({ approvalStatus: "approved" })
        .where(and(
          eq(lifeContextUpdates.id, updateId),
          eq(lifeContextUpdates.userId, session.user.id),
        ))
        .returning()

      return NextResponse.json({ update: updated })
    }

    // dismiss
    const [updated] = await db
      .update(lifeContextUpdates)
      .set({ approvalStatus: "dismissed" })
      .where(and(
        eq(lifeContextUpdates.id, updateId),
        eq(lifeContextUpdates.userId, session.user.id),
      ))
      .returning()

    return NextResponse.json({ update: updated })
  }

  // Standard edit (content + severity)
  const parsed = editSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const [updated] = await db
    .update(lifeContextUpdates)
    .set({
      content: parsed.data.content,
      severity: parsed.data.severity,
    })
    .where(
      and(
        eq(lifeContextUpdates.id, updateId),
        eq(lifeContextUpdates.userId, session.user.id),
      ),
    )
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ update: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; updateId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { updateId } = await params

  const [deleted] = await db
    .delete(lifeContextUpdates)
    .where(
      and(
        eq(lifeContextUpdates.id, updateId),
        eq(lifeContextUpdates.userId, session.user.id),
      ),
    )
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
