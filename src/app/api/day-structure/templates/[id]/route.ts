import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayStructureTemplates } from "@/lib/schema"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  sleepGoalHours: z.number().min(4).max(12).optional(),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  prepTimeMins: z.number().int().min(0).max(240).optional(),
  commuteTimeMins: z.number().int().min(0).max(240).optional(),
  workStartTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  lunchTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  dinnerTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  windDownMins: z.number().int().min(0).max(300).optional(),
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

  const updates: Record<string, unknown> = {}
  const data = parsed.data

  if (data.name !== undefined) updates.name = data.name
  if (data.daysOfWeek !== undefined) updates.daysOfWeek = JSON.stringify(data.daysOfWeek)
  if (data.sleepGoalHours !== undefined) updates.sleepGoalHours = data.sleepGoalHours
  if (data.wakeTime !== undefined) updates.wakeTime = data.wakeTime
  if (data.prepTimeMins !== undefined) updates.prepTimeMins = data.prepTimeMins
  if (data.commuteTimeMins !== undefined) updates.commuteTimeMins = data.commuteTimeMins
  if (data.workStartTime !== undefined) updates.workStartTime = data.workStartTime
  if (data.lunchTime !== undefined) updates.lunchTime = data.lunchTime
  if (data.dinnerTime !== undefined) updates.dinnerTime = data.dinnerTime
  if (data.windDownMins !== undefined) updates.windDownMins = data.windDownMins
  if (data.isActive !== undefined) updates.isActive = data.isActive

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  await db
    .update(dayStructureTemplates)
    .set(updates)
    .where(and(eq(dayStructureTemplates.id, id), eq(dayStructureTemplates.userId, session.user.id)))

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
    .update(dayStructureTemplates)
    .set({ isActive: false })
    .where(and(eq(dayStructureTemplates.id, id), eq(dayStructureTemplates.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
