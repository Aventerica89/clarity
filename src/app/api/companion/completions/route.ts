import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateCompanion } from "@/lib/companion-auth"
import { db } from "@/lib/db"
import { routineChecklistCompletions } from "@/lib/schema"

const completionSchema = z.object({
  itemId: z.string().min(1),
  completedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: NextRequest) {
  const authResult = await authenticateCompanion(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const parsed = completionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  try {
    await db
      .insert(routineChecklistCompletions)
      .values({
        itemId: parsed.data.itemId,
        userId,
        completedDate: parsed.data.completedDate,
      })
      .onConflictDoNothing()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[companion/completions] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
