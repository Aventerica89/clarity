import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { authenticateCompanion } from "@/lib/companion-auth"
import { db } from "@/lib/db"
import { companionSyncState } from "@/lib/schema"

const syncSchema = z.object({
  syncDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduleHash: z.string().min(1),
  appleReminderIds: z.array(z.string()),
  status: z.enum(["synced", "error", "stale"]),
  lastError: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const authResult = await authenticateCompanion(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const parsed = syncSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { syncDate, scheduleHash, appleReminderIds, status, lastError } = parsed.data

  try {
    const [existing] = await db
      .select({ id: companionSyncState.id })
      .from(companionSyncState)
      .where(
        and(
          eq(companionSyncState.userId, userId),
          eq(companionSyncState.syncDate, syncDate),
        ),
      )

    if (existing) {
      await db
        .update(companionSyncState)
        .set({
          scheduleHash,
          appleReminderIds: JSON.stringify(appleReminderIds),
          status,
          lastError: lastError ?? null,
          syncedAt: new Date(),
        })
        .where(eq(companionSyncState.id, existing.id))
    } else {
      await db
        .insert(companionSyncState)
        .values({
          userId: userId,
          syncDate,
          scheduleHash,
          appleReminderIds: JSON.stringify(appleReminderIds),
          status,
          lastError: lastError ?? null,
        })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[companion/sync-state] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
