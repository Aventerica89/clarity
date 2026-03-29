import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayStructureAlarms } from "@/lib/schema"

const createSchema = z.object({
  label: z.string().min(1).max(200),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  alarmType: z.enum(["alarm", "reminder"]).default("alarm"),
  sortOrder: z.number().int().min(0).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select()
    .from(dayStructureAlarms)
    .where(and(eq(dayStructureAlarms.templateId, id), eq(dayStructureAlarms.userId, session.user.id)))

  return NextResponse.json({ alarms: rows })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const [row] = await db
    .insert(dayStructureAlarms)
    .values({
      templateId: id,
      userId: session.user.id,
      label: parsed.data.label,
      time: parsed.data.time,
      alarmType: parsed.data.alarmType,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning()

  return NextResponse.json({ alarm: row })
}
