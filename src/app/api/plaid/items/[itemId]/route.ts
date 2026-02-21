import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems } from "@/lib/schema"
import { createPlaidClient } from "@/lib/plaid"
import { decryptToken } from "@/lib/crypto"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params

  // Fetch first so we can revoke at Plaid before deleting
  const [item] = await db
    .select({
      id: plaidItems.id,
      accessTokenEncrypted: plaidItems.accessTokenEncrypted,
    })
    .from(plaidItems)
    .where(and(eq(plaidItems.id, itemId), eq(plaidItems.userId, session.user.id)))
    .limit(1)

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  // Revoke the access token at Plaid (best-effort — don't block deletion on failure)
  try {
    const client = createPlaidClient()
    const accessToken = decryptToken(item.accessTokenEncrypted)
    await client.itemRemove({ access_token: accessToken })
  } catch {
    // Plaid revocation failure is non-fatal — proceed with local deletion
  }

  await db
    .delete(plaidItems)
    .where(and(eq(plaidItems.id, item.id), eq(plaidItems.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
