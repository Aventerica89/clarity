import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { revalidateTag } from "next/cache"
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

  const encrypted = encryptToken(parsed.data.token)

  await db
    .insert(integrations)
    .values({
      userId: session.user.id,
      provider: "openweathermap",
      accessTokenEncrypted: encrypted,
      syncStatus: "idle",
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: { accessTokenEncrypted: encrypted, syncStatus: "idle", lastError: null },
    })

  revalidateTag("weather")
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db
    .delete(integrations)
    .where(and(eq(integrations.userId, session.user.id), eq(integrations.provider, "openweathermap")))

  return NextResponse.json({ ok: true })
}
