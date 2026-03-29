import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { authenticateCompanion } from "@/lib/companion-auth"
import { db } from "@/lib/db"
import { integrations } from "@/lib/schema"

export async function POST(request: NextRequest) {
  const authResult = await authenticateCompanion(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const [existing] = await db
      .select({ id: integrations.id, config: integrations.config })
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, "apple_companion"),
        ),
      )

    const now = Math.floor(Date.now() / 1000)

    if (existing) {
      const currentConfig = JSON.parse(existing.config || "{}")
      await db
        .update(integrations)
        .set({
          config: JSON.stringify({ ...currentConfig, lastHeartbeat: now }),
          lastSyncedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id))
    } else {
      await db
        .insert(integrations)
        .values({
          userId,
          provider: "apple_companion",
          config: JSON.stringify({ lastHeartbeat: now }),
          syncStatus: "active",
        })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[companion/heartbeat] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
