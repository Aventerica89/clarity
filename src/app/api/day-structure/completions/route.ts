import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { routineChecklistCompletions } from "@/lib/schema"

const completionSchema = z.object({
  itemId: z.string().uuid(),
  completedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = completionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  try {
    const [row] = await db
      .insert(routineChecklistCompletions)
      .values({
        itemId: parsed.data.itemId,
        userId: session.user.id,
        completedDate: parsed.data.completedDate,
      })
      .onConflictDoNothing()
      .returning()

    return NextResponse.json({ completion: row ?? null })
  } catch (err) {
    console.error("[day-structure/completions] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = completionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  await db
    .delete(routineChecklistCompletions)
    .where(
      and(
        eq(routineChecklistCompletions.itemId, parsed.data.itemId),
        eq(routineChecklistCompletions.completedDate, parsed.data.completedDate),
        eq(routineChecklistCompletions.userId, session.user.id),
      ),
    )

  return NextResponse.json({ ok: true })
}
