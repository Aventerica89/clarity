import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { userProfile } from "@/lib/schema"

const profileSchema = z.object({
  occupation: z.string().max(200).optional(),
  employer: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  householdType: z.string().max(100).optional(),
  workSchedule: z.string().max(100).optional(),
  lifePhase: z.string().max(100).optional(),
  healthContext: z.string().max(1000).optional(),
  sideProjects: z.string().max(1000).optional(),
  lifeValues: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1)

  return NextResponse.json({ profile: rows[0] ?? null })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rawBody = await request.json().catch(() => ({}))
  const parsed = profileSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const fields = {
    occupation: parsed.data.occupation?.trim() || null,
    employer: parsed.data.employer?.trim() || null,
    city: parsed.data.city?.trim() || null,
    householdType: parsed.data.householdType?.trim() || null,
    workSchedule: parsed.data.workSchedule?.trim() || null,
    lifePhase: parsed.data.lifePhase?.trim() || null,
    healthContext: parsed.data.healthContext?.trim() || null,
    sideProjects: parsed.data.sideProjects?.trim() || null,
    lifeValues: parsed.data.lifeValues?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
  }

  await db
    .insert(userProfile)
    .values({ userId: session.user.id, ...fields })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: { ...fields, updatedAt: new Date() as unknown as Date },
    })

  return NextResponse.json({ ok: true })
}
