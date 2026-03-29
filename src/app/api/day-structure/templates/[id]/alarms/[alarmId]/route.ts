import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayStructureAlarms } from "@/lib/schema"

const patchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  alarmType: z.enum(["alarm", "reminder"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; alarmId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { alarmId } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  await db
    .update(dayStructureAlarms)
    .set(parsed.data)
    .where(and(eq(dayStructureAlarms.id, alarmId), eq(dayStructureAlarms.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; alarmId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { alarmId } = await params

  await db
    .delete(dayStructureAlarms)
    .where(and(eq(dayStructureAlarms.id, alarmId), eq(dayStructureAlarms.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
