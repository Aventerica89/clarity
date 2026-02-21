import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems, plaidAccounts } from "@/lib/schema"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.userId, session.user.id))

  const result = await Promise.all(
    items.map(async (item) => {
      const accounts = await db
        .select()
        .from(plaidAccounts)
        .where(eq(plaidAccounts.plaidItemId, item.id))

      return {
        id: item.id,
        institutionName: item.institutionName,
        syncStatus: item.syncStatus,
        lastSyncedAt: item.lastSyncedAt,
        lastError: item.lastError,
        accounts: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          subtype: a.subtype,
          currentBalanceCents: a.currentBalanceCents,
        })),
      }
    }),
  )

  return NextResponse.json({ items: result })
}
