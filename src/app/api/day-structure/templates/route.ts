import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayStructureTemplates } from "@/lib/schema"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  sleepGoalHours: z.number().min(4).max(12),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
  prepTimeMins: z.number().int().min(0).max(240),
  commuteTimeMins: z.number().int().min(0).max(240),
  workStartTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  lunchTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  dinnerTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  windDownMins: z.number().int().min(0).max(300).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(dayStructureTemplates)
    .where(eq(dayStructureTemplates.userId, session.user.id))

  return NextResponse.json({ templates: rows })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const [row] = await db
    .insert(dayStructureTemplates)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      daysOfWeek: JSON.stringify(parsed.data.daysOfWeek),
      sleepGoalHours: parsed.data.sleepGoalHours,
      wakeTime: parsed.data.wakeTime,
      prepTimeMins: parsed.data.prepTimeMins,
      commuteTimeMins: parsed.data.commuteTimeMins,
      workStartTime: parsed.data.workStartTime ?? null,
      lunchTime: parsed.data.lunchTime ?? null,
      dinnerTime: parsed.data.dinnerTime ?? null,
      windDownMins: parsed.data.windDownMins ?? 120,
    })
    .returning()

  return NextResponse.json({ template: row })
}
