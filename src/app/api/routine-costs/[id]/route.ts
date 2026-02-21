import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { routineCosts } from "@/lib/schema"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db
    .delete(routineCosts)
    .where(and(eq(routineCosts.id, id), eq(routineCosts.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const updates: Record<string, unknown> = {}
  if (typeof body.label === "string") updates.label = body.label.trim()
  if (typeof body.amountCents === "number") updates.amountCents = Math.round(body.amountCents)
  if (typeof body.category === "string") updates.category = body.category
  if (typeof body.frequency === "string") updates.frequency = body.frequency
  if (typeof body.notes === "string") updates.notes = body.notes.trim() || null

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  await db
    .update(routineCosts)
    .set(updates)
    .where(and(eq(routineCosts.id, id), eq(routineCosts.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
