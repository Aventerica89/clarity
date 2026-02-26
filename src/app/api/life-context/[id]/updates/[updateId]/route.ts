import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextUpdates } from "@/lib/schema"

const updateSchema = z.object({
  content: z.string().min(1).max(20000),
  severity: z.enum(["monitoring", "active", "escalated", "critical", "resolved"]),
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
  const parsed = updateSchema.safeParse(body)
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
