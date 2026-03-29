import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { routineChecklistItems } from "@/lib/schema"

const patchSchema = z.object({
  label: z.string().min(1).max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  await db
    .update(routineChecklistItems)
    .set(parsed.data)
    .where(and(eq(routineChecklistItems.id, itemId), eq(routineChecklistItems.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params

  await db
    .update(routineChecklistItems)
    .set({ isActive: false })
    .where(and(eq(routineChecklistItems.id, itemId), eq(routineChecklistItems.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
