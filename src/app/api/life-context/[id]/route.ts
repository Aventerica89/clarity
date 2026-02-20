import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems } from "@/lib/schema"

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  urgency: z.enum(["active", "critical"]).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body: unknown = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const now = new Date()
  const [updated] = await db
    .update(lifeContextItems)
    .set({ ...parsed.data, updatedAt: now })
    .where(and(eq(lifeContextItems.id, id), eq(lifeContextItems.userId, session.user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ item: updated })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const now = new Date()

  await db
    .update(lifeContextItems)
    .set({ isActive: false, updatedAt: now })
    .where(and(eq(lifeContextItems.id, id), eq(lifeContextItems.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
