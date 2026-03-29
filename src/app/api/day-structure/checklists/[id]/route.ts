import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { routineChecklists } from "@/lib/schema"

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  triggerTimeRef: z.string().min(1).max(50).optional(),
  alarmEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  if (Object.keys(parsed.data).length === 0) return NextResponse.json({ ok: true })

  await db
    .update(routineChecklists)
    .set(parsed.data)
    .where(and(eq(routineChecklists.id, id), eq(routineChecklists.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  await db
    .update(routineChecklists)
    .set({ isActive: false })
    .where(and(eq(routineChecklists.id, id), eq(routineChecklists.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
