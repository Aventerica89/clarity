import { NextRequest, NextResponse } from "next/server"
import { and, eq, like, notInArray } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { contextPins, lifeContextItems } from "@/lib/schema"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get("q")?.trim()
  const pinnedTypeRaw = request.nextUrl.searchParams.get("pinned_type")
  const pinnedId = request.nextUrl.searchParams.get("pinned_id")

  if (!q || q.length < 1 || q.length > 200) {
    return NextResponse.json({ results: [] })
  }

  const VALID_PINNED_TYPES = ["task", "email", "event", "context"] as const
  const pinnedType = VALID_PINNED_TYPES.includes(pinnedTypeRaw as typeof VALID_PINNED_TYPES[number])
    ? (pinnedTypeRaw as typeof VALID_PINNED_TYPES[number])
    : null

  // If pinned_type + pinned_id provided, exclude context items that already have this item pinned
  const excludeIds: string[] = []
  if (pinnedType && pinnedId) {
    const existing = await db
      .select({ contextItemId: contextPins.contextItemId })
      .from(contextPins)
      .where(
        and(
          eq(contextPins.pinnedType, pinnedType),
          eq(contextPins.pinnedId, pinnedId),
          eq(contextPins.userId, session.user.id),
        ),
      )
    for (const row of existing) {
      excludeIds.push(row.contextItemId)
    }

    // Also check reverse direction for context-to-context
    if (pinnedType === "context") {
      const reverse = await db
        .select({ pinnedId: contextPins.pinnedId })
        .from(contextPins)
        .where(
          and(
            eq(contextPins.contextItemId, pinnedId),
            eq(contextPins.pinnedType, "context"),
            eq(contextPins.userId, session.user.id),
          ),
        )
      for (const row of reverse) {
        excludeIds.push(row.pinnedId)
      }
    }
  }

  const results = await db
    .select({
      id: lifeContextItems.id,
      title: lifeContextItems.title,
      urgency: lifeContextItems.urgency,
    })
    .from(lifeContextItems)
    .where(
      and(
        eq(lifeContextItems.userId, session.user.id),
        eq(lifeContextItems.isActive, true),
        like(lifeContextItems.title, `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`),
        ...(excludeIds.length > 0 ? [notInArray(lifeContextItems.id, excludeIds)] : []),
      ),
    )
    .limit(8)

  return NextResponse.json({ results })
}
