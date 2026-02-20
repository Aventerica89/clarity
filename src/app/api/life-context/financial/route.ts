import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { financialSnapshot } from "@/lib/schema"

const updateSchema = z.object({
  bankBalanceCents: z.number().int().min(0),
  monthlyBurnCents: z.number().int().min(0),
  notes: z.string().max(500).nullable().optional(),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(financialSnapshot)
    .where(eq(financialSnapshot.userId, session.user.id))
    .limit(1)

  return NextResponse.json({ snapshot: rows[0] ?? null })
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const now = new Date()
  const [snapshot] = await db
    .insert(financialSnapshot)
    .values({ userId: session.user.id, ...parsed.data, updatedAt: now })
    .onConflictDoUpdate({
      target: financialSnapshot.userId,
      set: { ...parsed.data, updatedAt: now },
    })
    .returning()

  return NextResponse.json({ snapshot })
}
