import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, eq, gte, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems, contextPins, tasks, emails, events } from "@/lib/schema"

export type GraphNodeType = "context" | "task" | "email" | "event"

export interface GraphNode {
  id: string
  type: GraphNodeType
  label: string
  severity?: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const cutoff = new Date(Date.now() - SIXTY_DAYS_MS)

  // Fetch all active context items for this user
  const allItems = await db
    .select()
    .from(lifeContextItems)
    .where(
      and(
        eq(lifeContextItems.userId, userId),
        eq(lifeContextItems.isActive, true),
      ),
    )

  // Filter to items created or updated within the last 60 days
  const recentItems = allItems.filter(
    (item) => item.updatedAt >= cutoff || item.createdAt >= cutoff,
  )

  if (recentItems.length === 0) {
    return NextResponse.json({ nodes: [], edges: [] } satisfies GraphData)
  }

  const itemIds = recentItems.map((item) => item.id)

  // Fetch all pins for these context items
  const allPins = await db
    .select()
    .from(contextPins)
    .where(
      and(
        eq(contextPins.userId, userId),
        inArray(contextPins.contextItemId, itemIds),
      ),
    )

  // Collect pinned IDs by type for batch resolution
  const taskIds: string[] = []
  const emailIds: string[] = []
  const eventIds: string[] = []
  const contextPinIds: string[] = []

  for (const pin of allPins) {
    switch (pin.pinnedType) {
      case "task": taskIds.push(pin.pinnedId); break
      case "email": emailIds.push(pin.pinnedId); break
      case "event": eventIds.push(pin.pinnedId); break
      case "context": contextPinIds.push(pin.pinnedId); break
    }
  }

  // Batch-resolve labels for all pinned entity types
  const labelMap = new Map<string, string>()

  const resolveQueries: Promise<void>[] = []

  if (taskIds.length > 0) {
    resolveQueries.push(
      db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)))
        .then((rows) => {
          for (const r of rows) labelMap.set(r.id, r.title)
        }),
    )
  }

  if (emailIds.length > 0) {
    resolveQueries.push(
      db
        .select({ id: emails.id, subject: emails.subject })
        .from(emails)
        .where(and(eq(emails.userId, userId), inArray(emails.id, emailIds)))
        .then((rows) => {
          for (const r of rows) labelMap.set(r.id, r.subject)
        }),
    )
  }

  if (eventIds.length > 0) {
    resolveQueries.push(
      db
        .select({ id: events.id, title: events.title })
        .from(events)
        .where(and(eq(events.userId, userId), inArray(events.id, eventIds)))
        .then((rows) => {
          for (const r of rows) labelMap.set(r.id, r.title)
        }),
    )
  }

  if (contextPinIds.length > 0) {
    resolveQueries.push(
      db
        .select({ id: lifeContextItems.id, title: lifeContextItems.title })
        .from(lifeContextItems)
        .where(
          and(
            eq(lifeContextItems.userId, userId),
            inArray(lifeContextItems.id, contextPinIds),
          ),
        )
        .then((rows) => {
          for (const r of rows) labelMap.set(r.id, r.title)
        }),
    )
  }

  await Promise.all(resolveQueries)

  // Build context nodes
  const contextNodes: GraphNode[] = recentItems.map((item) => ({
    id: item.id,
    type: "context" as const,
    label: item.title,
    severity: item.urgency,
  }))

  // Build entity nodes — deduplicated by pinnedId
  const entityNodeMap = new Map<string, GraphNode>()

  for (const pin of allPins) {
    if (!entityNodeMap.has(pin.pinnedId)) {
      entityNodeMap.set(pin.pinnedId, {
        id: pin.pinnedId,
        type: pin.pinnedType as GraphNodeType,
        label: labelMap.get(pin.pinnedId) ?? "(deleted)",
      })
    }
  }

  const entityNodes = Array.from(entityNodeMap.values())

  // Build edges
  const edges: GraphEdge[] = allPins.map((pin) => ({
    id: pin.id,
    source: pin.contextItemId,
    target: pin.pinnedId,
  }))

  const nodes: GraphNode[] = [...contextNodes, ...entityNodes]

  return NextResponse.json({ nodes, edges } satisfies GraphData)
}
