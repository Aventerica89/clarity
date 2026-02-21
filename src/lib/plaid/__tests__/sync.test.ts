import { describe, it, expect } from "vitest"
import { computeNetCashFlowCents, aggregateBalanceCents } from "../sync"

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
