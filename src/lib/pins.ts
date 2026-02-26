import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  contextPins,
  lifeContextItems,
  tasks,
  emails,
  events,
} from "@/lib/schema"
import type { ContextPin, PinnedItemType } from "@/types/life-context"

interface RawPin {
  id: string
  contextItemId: string
  pinnedType: string
  pinnedId: string
  note: string | null
  createdAt: Date
  direction: "outgoing" | "incoming"
}

const TZ = "America/Phoenix"

export async function fetchPinsForContext(
  contextItemId: string,
  userId: string,
): Promise<ContextPin[]> {
  const [outgoing, incoming] = await Promise.all([
    db
      .select()
      .from(contextPins)
      .where(
        and(
          eq(contextPins.contextItemId, contextItemId),
          eq(contextPins.userId, userId),
        ),
      )
      .orderBy(desc(contextPins.createdAt)),
    db
      .select()
      .from(contextPins)
      .where(
        and(
          eq(contextPins.pinnedType, "context"),
          eq(contextPins.pinnedId, contextItemId),
          eq(contextPins.userId, userId),
        ),
      )
      .orderBy(desc(contextPins.createdAt)),
  ])

  const allPins: RawPin[] = [
    ...outgoing.map((p) => ({ ...p, direction: "outgoing" as const })),
    ...incoming.map((p) => ({ ...p, direction: "incoming" as const })),
  ]

  return resolvePins(allPins, userId)
}

export async function resolvePins(
  pinRows: RawPin[],
  userId: string,
): Promise<ContextPin[]> {
  if (pinRows.length === 0) return []

  // Collect IDs to resolve by type
  const taskIds: string[] = []
  const emailIds: string[] = []
  const eventIds: string[] = []
  const contextIds: string[] = []

  for (const pin of pinRows) {
    const resolveId = pin.direction === "incoming" ? pin.contextItemId : pin.pinnedId
    const resolveType = pin.direction === "incoming" ? "context" : pin.pinnedType

    switch (resolveType) {
      case "task": taskIds.push(resolveId); break
      case "email": emailIds.push(resolveId); break
      case "event": eventIds.push(resolveId); break
      case "context": contextIds.push(resolveId); break
    }
  }

  const titleMap = new Map<string, { title: string; subtitle: string | null }>()

  // Batch queries using inArray — only query if we have IDs to resolve
  const queries = []

  if (taskIds.length > 0) {
    queries.push(
      db
        .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)))
        .then((rows) => {
          for (const r of rows) {
            titleMap.set(r.id, { title: r.title, subtitle: r.dueDate ? `Due ${r.dueDate}` : null })
          }
        }),
    )
  }

  if (emailIds.length > 0) {
    queries.push(
      db
        .select({ id: emails.id, subject: emails.subject, fromRaw: emails.fromRaw })
        .from(emails)
        .where(and(eq(emails.userId, userId), inArray(emails.id, emailIds)))
        .then((rows) => {
          for (const r of rows) {
            titleMap.set(r.id, { title: r.subject, subtitle: r.fromRaw })
          }
        }),
    )
  }

  if (eventIds.length > 0) {
    queries.push(
      db
        .select({ id: events.id, title: events.title, startAt: events.startAt })
        .from(events)
        .where(and(eq(events.userId, userId), inArray(events.id, eventIds)))
        .then((rows) => {
          for (const r of rows) {
            titleMap.set(r.id, {
              title: r.title,
              subtitle: r.startAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ }),
            })
          }
        }),
    )
  }

  if (contextIds.length > 0) {
    queries.push(
      db
        .select({ id: lifeContextItems.id, title: lifeContextItems.title, urgency: lifeContextItems.urgency })
        .from(lifeContextItems)
        .where(and(eq(lifeContextItems.userId, userId), inArray(lifeContextItems.id, contextIds)))
        .then((rows) => {
          for (const r of rows) {
            titleMap.set(r.id, { title: r.title, subtitle: r.urgency })
          }
        }),
    )
  }

  await Promise.all(queries)

  return pinRows.map((pin) => {
    const resolveId = pin.direction === "incoming" ? pin.contextItemId : pin.pinnedId
    const resolved = titleMap.get(resolveId) ?? { title: "(deleted)", subtitle: null }
    return {
      id: pin.id,
      contextItemId: pin.contextItemId,
      pinnedType: (pin.direction === "incoming" ? "context" : pin.pinnedType) as PinnedItemType,
      pinnedId: pin.direction === "incoming" ? pin.contextItemId : pin.pinnedId,
      note: pin.note,
      createdAt: pin.createdAt.toISOString(),
      direction: pin.direction,
      resolved,
    }
  })
}
