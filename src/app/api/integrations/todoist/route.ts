import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { integrations } from "@/lib/schema"
import { saveTodoistToken, deleteTodoistToken } from "@/lib/integrations/todoist"
import { z } from "zod"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await db
    .select({ syncStatus: integrations.syncStatus, lastSyncedAt: integrations.lastSyncedAt })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "todoist"),
      ),
    )
    .limit(1)

  const row = rows[0]
  return NextResponse.json({
    connected: Boolean(row),
    syncStatus: row?.syncStatus ?? null,
    lastSyncedAt: row?.lastSyncedAt ?? null,
  })
}

const saveSchema = z.object({ token: z.string().min(1) })

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 })
  }

  await saveTodoistToken(session.user.id, parsed.data.token)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await deleteTodoistToken(session.user.id)
  return NextResponse.json({ ok: true })
}
