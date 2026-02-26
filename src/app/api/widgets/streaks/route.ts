import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { routines, routineCompletions } from "@/lib/schema"

const TIMEZONE = "America/Phoenix"

function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const today = todayString()

    // Fetch active routines
    const activeRoutines = await db
      .select({
        id: routines.id,
        title: routines.title,
        streakCurrent: routines.streakCurrent,
      })
      .from(routines)
      .where(
        and(
          eq(routines.userId, userId),
          eq(routines.isActive, true),
        ),
      )
      .limit(8)

    // Check which were completed today
    const completions = await db
      .select({ routineId: routineCompletions.routineId })
      .from(routineCompletions)
      .where(
        and(
          eq(routineCompletions.userId, userId),
          eq(routineCompletions.completedDate, today),
        ),
      )

    const completedSet = new Set(completions.map((c) => c.routineId))

    const result = activeRoutines.map((r) => ({
      id: r.id,
      title: r.title,
      streak: r.streakCurrent,
      completedToday: completedSet.has(r.id),
    }))

    return NextResponse.json({ routines: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
