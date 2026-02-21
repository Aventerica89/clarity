import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { userProfile } from "@/lib/schema"

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

  const body = await request.json().catch(() => ({})) as Record<string, string>

  const fields = {
    occupation: body.occupation?.trim() || null,
    employer: body.employer?.trim() || null,
    city: body.city?.trim() || null,
    householdType: body.householdType?.trim() || null,
    workSchedule: body.workSchedule?.trim() || null,
    lifePhase: body.lifePhase?.trim() || null,
    healthContext: body.healthContext?.trim() || null,
    sideProjects: body.sideProjects?.trim() || null,
    lifeValues: body.lifeValues?.trim() || null,
    notes: body.notes?.trim() || null,
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
