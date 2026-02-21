import { type PlaidApi } from "plaid"
import { sql } from "drizzle-orm"

const TRANSFER_CATEGORIES = new Set(["TRANSFER_IN", "TRANSFER_OUT"])

interface PlaidItem {
  id: string
  userId: string
  accessTokenEncrypted: string
}

interface TransactionLike {
  amount: number
  personal_finance_category?: { primary: string } | null
}

interface AccountLike {
  type: string
  currentBalanceCents: number
}

// Returns net cash flow in cents.
// Positive = net outflow (burning money), negative = net inflow (saving).
// Excludes transfer transactions to avoid double-counting (e.g. credit card payments).
export function computeNetCashFlowCents(transactions: TransactionLike[]): number {
  let totalDollars = 0
  for (const t of transactions) {
    const category = t.personal_finance_category?.primary
    if (category && TRANSFER_CATEGORIES.has(category)) continue
    totalDollars += t.amount
  }
  return Math.round(totalDollars * 100)
}

// Returns total balance of depository accounts (checking + savings) in cents.
// Excludes credit, loan, and investment accounts.
export function aggregateBalanceCents(accounts: AccountLike[]): number {
  return accounts
    .filter((a) => a.type === "depository")
    .reduce((sum, a) => sum + a.currentBalanceCents, 0)
}

// Syncs one Plaid Item: refreshes account balances and computes net cash flow.
// Lazy-imports db/crypto/plaid so pure functions can be tested without live env vars.
async function syncPlaidItem(
  plaidClient: PlaidApi,
  item: PlaidItem,
): Promise<{ bankBalanceCents: number; netFlowCents: number }> {
  const { decryptToken } = await import("@/lib/crypto")
  const { plaidAccounts } = await import("@/lib/schema")
  const { db } = await import("@/lib/db")

  const accessToken = decryptToken(item.accessTokenEncrypted)

  // 1. Fetch current balances
  const balanceResponse = await plaidClient.accountsBalanceGet({ access_token: accessToken })
  const plaidAccountList = balanceResponse.data.accounts

  const now = new Date()

  // Batch upsert all accounts in a single query (avoids N+1)
  const accountRows = plaidAccountList.map((acct: {
    account_id: string
    name: string
    type: string
    subtype?: string | null
    balances: { current?: number | null; available?: number | null }
  }) => ({
    id: crypto.randomUUID(),
    userId: item.userId,
    plaidItemId: item.id,
    plaidAccountId: acct.account_id,
    name: acct.name,
    type: acct.type,
    subtype: acct.subtype ?? null,
    currentBalanceCents: Math.round((acct.balances.current ?? 0) * 100),
    availableBalanceCents: acct.balances.available != null
      ? Math.round(acct.balances.available * 100)
      : null,
    lastUpdatedAt: now,
  }))

  if (accountRows.length > 0) {
    await db.insert(plaidAccounts).values(accountRows).onConflictDoUpdate({
      target: plaidAccounts.plaidAccountId,
      set: {
        name: sql`excluded.name`,
        type: sql`excluded.type`,
        subtype: sql`excluded.subtype`,
        currentBalanceCents: sql`excluded.current_balance_cents`,
        availableBalanceCents: sql`excluded.available_balance_cents`,
        lastUpdatedAt: sql`excluded.last_updated_at`,
      },
    })
  }

  // 2. Fetch last 30 days of transactions (immutable date calculation)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const txResponse = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: thirtyDaysAgo.toISOString().slice(0, 10),
    end_date: now.toISOString().slice(0, 10),
  })

  const netFlowCents = computeNetCashFlowCents(txResponse.data.transactions as TransactionLike[])

  const bankBalanceCents = aggregateBalanceCents(
    plaidAccountList.map((a: { type: string; balances: { current?: number | null } }) => ({
      type: a.type,
      currentBalanceCents: Math.round((a.balances.current ?? 0) * 100),
    })),
  )

  return { bankBalanceCents, netFlowCents }
}

// Entry point: syncs all Plaid Items for a user, updates financialSnapshot.
// Uses dynamic imports so that the module can be loaded without live env vars
// (enables unit testing of the pure helper functions above).
export async function syncPlaidForUser(userId: string): Promise<{ synced: number; error?: string }> {
  const { eq } = await import("drizzle-orm")
  const { db } = await import("@/lib/db")
  const { plaidItems, financialSnapshot } = await import("@/lib/schema")
  const { createPlaidClient } = await import("@/lib/plaid")

  const items = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId))

  if (items.length === 0) return { synced: 0 }

  const plaidClient = createPlaidClient()
  let totalBankCents = 0
  let totalNetFlowCents = 0
  let synced = 0

  for (const item of items) {
    try {
      await db
        .update(plaidItems)
        .set({ syncStatus: "syncing", updatedAt: new Date() })
        .where(eq(plaidItems.id, item.id))

      const { bankBalanceCents, netFlowCents } = await syncPlaidItem(plaidClient, item)
      totalBankCents += bankBalanceCents
      totalNetFlowCents += netFlowCents
      synced++

      await db
        .update(plaidItems)
        .set({ syncStatus: "idle", lastSyncedAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(plaidItems.id, item.id))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await db
        .update(plaidItems)
        .set({ syncStatus: "error", lastError: message, updatedAt: new Date() })
        .where(eq(plaidItems.id, item.id))
    }
  }

  // Only update snapshot if at least one item synced successfully.
  // Skipping when synced === 0 prevents overwriting a previously valid
  // snapshot with zeros when all Plaid items fail in the current run.
  if (synced > 0) {
    await db
      .insert(financialSnapshot)
      .values({
        userId,
        bankBalanceCents: totalBankCents,
        monthlyBurnCents: totalNetFlowCents,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: financialSnapshot.userId,
        set: {
          bankBalanceCents: totalBankCents,
          monthlyBurnCents: totalNetFlowCents,
          updatedAt: new Date(),
        },
      })
  }

  return { synced }
}
