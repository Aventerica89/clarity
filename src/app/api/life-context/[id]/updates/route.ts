import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems, lifeContextUpdates } from "@/lib/schema"

const createSchema = z.object({
  content: z.string().min(1).max(20000),
  severity: z.enum(["monitoring", "active", "escalated", "critical", "resolved"]),
  source: z.enum(["user", "ai"]).default("user"),
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

  const updates = await db
    .select()
    .from(lifeContextUpdates)
    .where(
      and(
        eq(lifeContextUpdates.contextItemId, id),
        eq(lifeContextUpdates.userId, session.user.id),
      ),
    )
    .orderBy(desc(lifeContextUpdates.createdAt))

  return NextResponse.json({ updates })
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

  // Verify the context item belongs to this user
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
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const now = new Date()

  // Insert the update and update the parent item's urgency + timestamp
  const [update] = await db
    .insert(lifeContextUpdates)
    .values({
      contextItemId: id,
      userId: session.user.id,
      content: parsed.data.content,
      severity: parsed.data.severity,
      source: parsed.data.source,
    })
    .returning()

  await db
    .update(lifeContextItems)
    .set({ urgency: parsed.data.severity, updatedAt: now })
    .where(eq(lifeContextItems.id, id))

  return NextResponse.json({ update }, { status: 201 })
}
