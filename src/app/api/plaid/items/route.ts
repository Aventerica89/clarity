import { NextRequest, NextResponse } from "next/server"
import { eq, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems, plaidAccounts } from "@/lib/schema"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const items = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.userId, session.user.id))

    if (items.length === 0) {
      return NextResponse.json({ items: [] })
    }

    // Single query for all accounts across all items
    const itemIds = items.map((i) => i.id)
    const accounts = await db
      .select()
      .from(plaidAccounts)
      .where(inArray(plaidAccounts.plaidItemId, itemIds))

    // Group accounts by plaidItemId for O(1) lookup
    const accountsByItemId = new Map<string, typeof accounts>()
    for (const account of accounts) {
      const existing = accountsByItemId.get(account.plaidItemId) ?? []
      accountsByItemId.set(account.plaidItemId, [...existing, account])
    }

    const result = items.map((item) => ({
      id: item.id,
      institutionName: item.institutionName,
      syncStatus: item.syncStatus,
      lastSyncedAt: item.lastSyncedAt,
      lastError: item.lastError,
      accounts: (accountsByItemId.get(item.id) ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        currentBalanceCents: a.currentBalanceCents,
      })),
    }))

    return NextResponse.json({ items: result })
  } catch {
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 })
  }
}
