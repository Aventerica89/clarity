// ─── Transaction item (matches DB row shape) ────────────────────────────────

export interface TransactionItem {
  id: string
  date: string
  amountCents: number
  name: string
  merchantName: string | null
  category: string | null
  subcategory: string | null
  pending: boolean
  isRecurring: boolean
  accountLabel: string | null
  accountId: string | null
  source: string
}

// ─── Filter types ────────────────────────────────────────────────────────────

export interface TransactionFilters {
  category: string    // "all" | category value
  account: string     // "all" | "personal" | "business" | accountId
  dateRange: string   // "30d" | "60d" | "90d" | "all"
  search: string
}

export const DEFAULT_FILTERS: TransactionFilters = {
  category: "all",
  account: "all",
  dateRange: "30d",
  search: "",
}

// ─── Category constants ──────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  FOOD_AND_DRINK: "Food & Drink",
  TRANSPORTATION: "Transportation",
  RENT_AND_UTILITIES: "Rent & Utilities",
  GENERAL_MERCHANDISE: "Shopping",
  ENTERTAINMENT: "Entertainment",
  PERSONAL_CARE: "Personal Care",
  GENERAL_SERVICES: "Services",
  MEDICAL: "Medical",
  TRAVEL: "Travel",
  LOAN_PAYMENTS: "Loan Payments",
  BANK_FEES: "Bank Fees",
  INCOME: "Income",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  OTHER: "Other",
}

export const CATEGORY_LIST = Object.keys(CATEGORY_LABELS)

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const dollars = (abs / 100).toFixed(2)
  return cents < 0 ? `-$${dollars}` : `$${dollars}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function getCategoryLabel(category: string | null): string {
  if (!category) return "Uncategorized"
  return CATEGORY_LABELS[category] ?? category
}

export function groupTransactionsByDate(
  txns: TransactionItem[],
): Record<string, TransactionItem[]> {
  const groups: Record<string, TransactionItem[]> = {}

  for (const txn of txns) {
    const existing = groups[txn.date] ?? []
    groups[txn.date] = [...existing, txn]
  }

  return groups
}
