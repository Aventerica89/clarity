import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems } from "@/lib/schema"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  urgency: z.enum(["active", "critical"]).default("active"),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await db
    .select()
    .from(lifeContextItems)
    .where(and(eq(lifeContextItems.userId, session.user.id), eq(lifeContextItems.isActive, true)))
    .orderBy(desc(lifeContextItems.urgency), desc(lifeContextItems.createdAt))

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [item] = await db
    .insert(lifeContextItems)
    .values({ userId: session.user.id, ...parsed.data })
    .returning()

  return NextResponse.json({ item }, { status: 201 })
}
