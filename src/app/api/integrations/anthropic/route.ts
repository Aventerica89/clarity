import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { integrations } from "@/lib/schema"
import { encryptToken } from "@/lib/crypto"

const saveSchema = z.object({ token: z.string().min(1) })

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Token is required" }, { status: 400 })

  if (parsed.data.token.startsWith("sk-ant-oat")) {
    return NextResponse.json(
      { error: "This is a Claude.ai OAuth token — it cannot be used with the Anthropic API. Please create an API key at console.anthropic.com instead." },
      { status: 400 },
    )
  }

  const encrypted = encryptToken(parsed.data.token)

  await db
    .insert(integrations)
    .values({
      userId: session.user.id,
      provider: "anthropic",
      accessTokenEncrypted: encrypted,
      syncStatus: "idle",
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: { accessTokenEncrypted: encrypted, syncStatus: "idle", lastError: null },
    })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db
    .delete(integrations)
    .where(and(eq(integrations.userId, session.user.id), eq(integrations.provider, "anthropic")))

  return NextResponse.json({ ok: true })
}
