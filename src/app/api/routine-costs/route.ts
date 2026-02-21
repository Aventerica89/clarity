import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { routineCosts } from "@/lib/schema"

const VALID_CATEGORIES = ["housing", "insurance", "medical", "transport", "subscription", "utilities", "other"] as const
const VALID_FREQUENCIES = ["monthly", "weekly", "biweekly", "annual"] as const

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(routineCosts)
    .where(and(eq(routineCosts.userId, session.user.id), eq(routineCosts.isActive, true)))

  return NextResponse.json({ costs: rows })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const label = typeof body.label === "string" ? body.label.trim() : ""
  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 })

  const amountCents = Math.round(Number(body.amountCents))
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }

  const category = VALID_CATEGORIES.includes(body.category as typeof VALID_CATEGORIES[number])
    ? (body.category as string)
    : "other"

  const frequency = VALID_FREQUENCIES.includes(body.frequency as typeof VALID_FREQUENCIES[number])
    ? (body.frequency as string)
    : "monthly"

  const [row] = await db
    .insert(routineCosts)
    .values({
      userId: session.user.id,
      label,
      category,
      amountCents,
      frequency,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    })
    .returning()

  return NextResponse.json({ cost: row })
}
