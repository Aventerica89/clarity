import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  contextPins,
  lifeContextItems,
  tasks,
  emails,
  events,
} from "@/lib/schema"
import { fetchPinsForContext, resolvePins } from "@/lib/pins"

const createSchema = z.object({
  pinnedType: z.enum(["task", "email", "event", "context"]),
  pinnedId: z.string().min(1),
  note: z.string().max(500).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const pins = await fetchPinsForContext(id, session.user.id)

  return NextResponse.json({ pins })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body: unknown = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { pinnedType, pinnedId, note } = parsed.data

  // Verify the context item belongs to the user
  const [item] = await db
    .select({ id: lifeContextItems.id })
    .from(lifeContextItems)
    .where(
      and(
        eq(lifeContextItems.id, id),
        eq(lifeContextItems.userId, session.user.id),
      ),
    )
    .limit(1)

  if (!item) {
    return NextResponse.json({ error: "Context item not found" }, { status: 404 })
  }

  // Verify the target item exists and belongs to the user
  const targetTable = { task: tasks, email: emails, event: events, context: lifeContextItems }[pinnedType]
  if (!targetTable) {
    return NextResponse.json({ error: "Invalid pinned type" }, { status: 400 })
  }

  const [target] = await db
    .select({ id: targetTable.id })
    .from(targetTable)
    .where(
      and(
        eq(targetTable.id, pinnedId),
        eq(targetTable.userId, session.user.id),
      ),
    )
    .limit(1)

  if (!target) {
    return NextResponse.json({ error: "Target item not found" }, { status: 404 })
  }

  // Prevent self-pinning
  if (pinnedType === "context" && pinnedId === id) {
    return NextResponse.json({ error: "Cannot pin an item to itself" }, { status: 400 })
  }

  // For context-to-context, normalize: always store with the lower ID as contextItemId
  // to prevent duplicate bidirectional rows
  let storeContextItemId = id
  let storePinnedId = pinnedId
  if (pinnedType === "context" && pinnedId < id) {
    storeContextItemId = pinnedId
    storePinnedId = id
  }

  try {
    const [pin] = await db
      .insert(contextPins)
      .values({
        userId: session.user.id,
        contextItemId: storeContextItemId,
        pinnedType,
        pinnedId: storePinnedId,
        note: note ?? null,
      })
      .returning()

    // Resolve the pin for the response
    const direction = storeContextItemId === id ? "outgoing" : "incoming"
    const resolved = await resolvePins(
      [{ ...pin, direction }],
      session.user.id,
    )

    return NextResponse.json({ pin: resolved[0] }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "This item is already pinned" }, { status: 409 })
    }
    throw err
  }
}
