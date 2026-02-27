import { NextRequest, NextResponse } from "next/server"
import { and, eq, like, ne, notInArray } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  contextPins,
  lifeContextItems,
  tasks,
  emails,
  events,
} from "@/lib/schema"

interface SearchResult {
  type: "task" | "email" | "event" | "context"
  id: string
  title: string
  subtitle: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const q = request.nextUrl.searchParams.get("q")?.trim()

  if (!q || q.length < 1 || q.length > 200) {
    return NextResponse.json({ results: [] })
  }

  const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_")
  const pattern = `%${escaped}%`

  // Get already-pinned IDs to exclude them
  const existingPins = await db
    .select({ pinnedType: contextPins.pinnedType, pinnedId: contextPins.pinnedId })
    .from(contextPins)
    .where(
      and(
        eq(contextPins.contextItemId, id),
        eq(contextPins.userId, session.user.id),
      ),
    )

  // Also get incoming context pins (where this item is the target)
  const incomingPins = await db
    .select({ contextItemId: contextPins.contextItemId })
    .from(contextPins)
    .where(
      and(
        eq(contextPins.pinnedType, "context"),
        eq(contextPins.pinnedId, id),
        eq(contextPins.userId, session.user.id),
      ),
    )

  const pinnedTaskIds = existingPins.filter((p) => p.pinnedType === "task").map((p) => p.pinnedId)
  const pinnedEmailIds = existingPins.filter((p) => p.pinnedType === "email").map((p) => p.pinnedId)
  const pinnedEventIds = existingPins.filter((p) => p.pinnedType === "event").map((p) => p.pinnedId)
  const pinnedContextIds = [
    ...existingPins.filter((p) => p.pinnedType === "context").map((p) => p.pinnedId),
    ...incomingPins.map((p) => p.contextItemId),
    id, // exclude self
  ]

  // Parallel searches across all types
  const [taskResults, emailResults, eventResults, contextResults] = await Promise.all([
    db
      .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, session.user.id),
          like(tasks.title, pattern),
          ...(pinnedTaskIds.length > 0 ? [notInArray(tasks.id, pinnedTaskIds)] : []),
        ),
      )
      .limit(5),

    db
      .select({ id: emails.id, subject: emails.subject, fromRaw: emails.fromRaw })
      .from(emails)
      .where(
        and(
          eq(emails.userId, session.user.id),
          like(emails.subject, pattern),
          ...(pinnedEmailIds.length > 0 ? [notInArray(emails.id, pinnedEmailIds)] : []),
        ),
      )
      .limit(5),

    db
      .select({ id: events.id, title: events.title, startAt: events.startAt })
      .from(events)
      .where(
        and(
          eq(events.userId, session.user.id),
          like(events.title, pattern),
          ...(pinnedEventIds.length > 0 ? [notInArray(events.id, pinnedEventIds)] : []),
        ),
      )
      .limit(5),

    db
      .select({ id: lifeContextItems.id, title: lifeContextItems.title, urgency: lifeContextItems.urgency })
      .from(lifeContextItems)
      .where(
        and(
          eq(lifeContextItems.userId, session.user.id),
          eq(lifeContextItems.isActive, true),
          like(lifeContextItems.title, pattern),
          ...(pinnedContextIds.length > 0 ? [notInArray(lifeContextItems.id, pinnedContextIds)] : []),
        ),
      )
      .limit(5),
  ])

  const results: SearchResult[] = [
    ...taskResults.map((r) => ({
      type: "task" as const,
      id: r.id,
      title: r.title,
      subtitle: r.dueDate ? `Due ${r.dueDate}` : null,
    })),
    ...emailResults.map((r) => ({
      type: "email" as const,
      id: r.id,
      title: r.subject,
      subtitle: r.fromRaw,
    })),
    ...eventResults.map((r) => ({
      type: "event" as const,
      id: r.id,
      title: r.title,
      subtitle: r.startAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Phoenix" }),
    })),
    ...contextResults.map((r) => ({
      type: "context" as const,
      id: r.id,
      title: r.title,
      subtitle: r.urgency,
    })),
  ]

  return NextResponse.json({ results })
}
