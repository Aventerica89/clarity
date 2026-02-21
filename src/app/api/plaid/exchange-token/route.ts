import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems } from "@/lib/schema"
import { encryptToken } from "@/lib/crypto"
import { createPlaidClient } from "@/lib/plaid"

const exchangeSchema = z.object({
  public_token: z.string().min(1),
  institution_id: z.string().min(1),
  institution_name: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = exchangeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { public_token, institution_id, institution_name } = parsed.data

  const client = createPlaidClient()
  const exchangeResponse = await client.itemPublicTokenExchange({ public_token })

  const { access_token, item_id } = exchangeResponse.data

  await db
    .insert(plaidItems)
    .values({
      userId: session.user.id,
      plaidItemId: item_id,
      institutionId: institution_id,
      institutionName: institution_name,
      accessTokenEncrypted: encryptToken(access_token),
      syncStatus: "idle",
    })
    .onConflictDoUpdate({
      target: plaidItems.plaidItemId,
      set: {
        accessTokenEncrypted: encryptToken(access_token),
        syncStatus: "idle",
        lastError: null,
        updatedAt: new Date(),
      },
    })

  return NextResponse.json({ ok: true, institution: institution_name }, { status: 201 })
}
