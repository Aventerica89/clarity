import { describe, it, expect, vi, beforeEach } from "vitest"
import { computeNetCashFlowCents, aggregateBalanceCents, syncPlaidForUser } from "../sync"

describe("computeNetCashFlowCents", () => {
  it("returns 0 for empty transactions", () => {
    expect(computeNetCashFlowCents([])).toBe(0)
  })

  it("positive result = net outflow (burning money)", () => {
    // Plaid: positive amount = outflow (expense)
    const transactions = [
      { amount: 100.00 }, // $100 expense
      { amount: 50.00 },  // $50 expense
    ]
    // Net outflow = $150 → 15000 cents
    expect(computeNetCashFlowCents(transactions as any)).toBe(15000)
  })

  it("negative result = net inflow (saving money)", () => {
    const transactions = [
      { amount: -2000.00 }, // $2000 income (paycheck)
      { amount: 500.00 },   // $500 expenses
    ]
    // Net = 500 - 2000 = -1500 → -150000 cents
    expect(computeNetCashFlowCents(transactions as any)).toBe(-150000)
  })

  it("excludes transfer transactions to avoid double-counting", () => {
    const transactions = [
      { amount: 100.00, personal_finance_category: { primary: "FOOD_AND_DRINK" } },
      { amount: 1000.00, personal_finance_category: { primary: "TRANSFER_OUT" } },
      { amount: -50.00, personal_finance_category: { primary: "TRANSFER_IN" } },
    ]
    // Only $100 food expense counts
    expect(computeNetCashFlowCents(transactions as any)).toBe(10000)
  })
})

describe("aggregateBalanceCents", () => {
  it("sums only depository account balances", () => {
    const accounts = [
      { type: "depository", currentBalanceCents: 320000 },
      { type: "depository", currentBalanceCents: 50000 },
      { type: "credit", currentBalanceCents: 80000 },
    ]
    expect(aggregateBalanceCents(accounts)).toBe(370000)
  })

  it("returns 0 for no depository accounts", () => {
    const accounts = [{ type: "credit", currentBalanceCents: 80000 }]
    expect(aggregateBalanceCents(accounts)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// syncPlaidForUser — mocked tests (no real DB or Plaid calls)
// ---------------------------------------------------------------------------

// We mock the dynamic imports used inside syncPlaidForUser.
// The function uses `await import("drizzle-orm")`, `await import("@/lib/db")`, etc.
// Vitest's vi.mock hoists the mock before module evaluation.

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn((_col: unknown, _val: unknown) => "eq-condition"),
    sql: actual.sql,
  }
})

// Shared mock db — we reassign its select/update/insert per test as needed.
const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}

vi.mock("@/lib/db", () => ({ db: mockDb }))

vi.mock("@/lib/schema", () => ({
  plaidItems: { userId: "userId-col", id: "id-col" },
  financialSnapshot: { userId: "userId-col" },
  plaidAccounts: { plaidAccountId: "plaid_account_id" },
}))

vi.mock("@/lib/plaid", () => ({
  createPlaidClient: vi.fn(() => ({})),
}))

// We'll spy on syncPlaidItem indirectly by mocking the modules it uses.
// For syncPlaidForUser tests we mock the inner syncPlaidItem by mocking its
// dependencies via vi.mock on the crypto module and controlling db behaviour.

vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn((t: string) => t),
}))

describe("syncPlaidForUser", () => {
  const userId = "user-abc"

  // Helper: make mockDb.select chain return the given rows.
  function mockSelectReturning(rows: unknown[]) {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rows),
    }
    mockDb.select.mockReturnValue(chain)
  }

  // Helper: make mockDb.update chain resolve silently.
  function mockUpdateOk() {
    const chain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    }
    mockDb.update.mockReturnValue(chain)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("resolves without throwing when syncPlaidItem succeeds", async () => {
    // Return one plaid item from the DB
    mockSelectReturning([
      { id: "item-1", userId, accessTokenEncrypted: "enc-token" },
    ])
    mockUpdateOk()

    // Mock the plaidClient inside the dynamic import by pre-configuring
    // createPlaidClient to return a client whose methods resolve successfully.
    const { createPlaidClient } = await import("@/lib/plaid")
    vi.mocked(createPlaidClient).mockReturnValue({
      accountsBalanceGet: vi.fn().mockResolvedValue({
        data: { accounts: [] },
      }),
      transactionsGet: vi.fn().mockResolvedValue({
        data: { transactions: [] },
      }),
    } as any)

    // financialSnapshot insert (synced will be 0 since accounts list is empty
    // and aggregateBalanceCents returns 0, but the item itself succeeds).
    // Because accounts is empty, bankBalanceCents = 0, netFlowCents = 0,
    // synced = 1 → snapshot insert runs.
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    }
    mockDb.insert.mockReturnValue(insertChain)

    await expect(syncPlaidForUser(userId)).resolves.toMatchObject({ synced: 1 })
  })

  it("resolves without throwing when syncPlaidItem fails (swallows per-item errors)", async () => {
    // Return one plaid item from the DB
    mockSelectReturning([
      { id: "item-2", userId, accessTokenEncrypted: "enc-token" },
    ])
    mockUpdateOk()

    // Make the plaidClient throw so syncPlaidItem rejects
    const { createPlaidClient } = await import("@/lib/plaid")
    vi.mocked(createPlaidClient).mockReturnValue({
      accountsBalanceGet: vi.fn().mockRejectedValue(new Error("Plaid API error")),
      transactionsGet: vi.fn().mockRejectedValue(new Error("Plaid API error")),
    } as any)

    // syncPlaidForUser should NOT throw — it catches per-item errors internally
    const result = await syncPlaidForUser(userId)
    expect(result).toMatchObject({ synced: 0 })
  })
})
