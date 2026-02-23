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
    .select({
      syncStatus: integrations.syncStatus,
      lastSyncedAt: integrations.lastSyncedAt,
      config: integrations.config,
      providerAccountId: integrations.providerAccountId,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "todoist"),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row) {
    return NextResponse.json({ connected: false, syncStatus: null, lastSyncedAt: null })
  }

  let displayName: string | null = null
  let connectionMethod: string | null = null
  try {
    const config = JSON.parse(row.config ?? "{}") as Record<string, unknown>
    displayName = typeof config.todoistDisplayName === "string" ? config.todoistDisplayName : null
    connectionMethod = typeof config.connectionMethod === "string" ? config.connectionMethod : null
  } catch {
    // Malformed config JSON — treat as empty
  }

  return NextResponse.json({
    connected: true,
    syncStatus: row.syncStatus,
    lastSyncedAt: row.lastSyncedAt,
    displayName,
    connectionMethod,
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

  await saveTodoistToken(session.user.id, parsed.data.token, {
    config: { connectionMethod: "token" },
  })
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
