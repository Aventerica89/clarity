import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems, plaidAccounts } from "@/lib/schema"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items = await db
    .select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
    })
    .from(plaidItems)
    .where(eq(plaidItems.userId, session.user.id))

  const accounts = await db
    .select({
      plaidItemId: plaidAccounts.plaidItemId,
      plaidAccountId: plaidAccounts.plaidAccountId,
      name: plaidAccounts.name,
      type: plaidAccounts.type,
    })
    .from(plaidAccounts)
    .where(eq(plaidAccounts.userId, session.user.id))

  // Group accounts by institution
  const institutions = items.map((item) => ({
    id: item.id,
    name: item.institutionName,
    accountIds: accounts
      .filter((a) => a.plaidItemId === item.id)
      .map((a) => a.plaidAccountId),
  }))

  return NextResponse.json({ institutions })
}
