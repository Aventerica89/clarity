"use client"

import { useState, useEffect, useCallback } from "react"
import { SpendingFilterBar } from "@/components/spending/spending-filter-bar"
import { TransactionRow } from "@/components/spending/transaction-row"
import {
  AccountSidebar,
  type SpendingInstitution,
} from "@/components/spending/account-sidebar"
import {
  type TransactionItem,
  type TransactionFilters,
  DEFAULT_FILTERS,
  formatDate,
  groupTransactionsByDate,
} from "@/types/transaction"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function TransactionList() {
  const [txns, setTxns] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [institutions, setInstitutions] = useState<SpendingInstitution[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState("all")

  // Fetch institutions once on mount
  useEffect(() => {
    fetch("/api/spending/accounts")
      .then((r) => r.json())
      .then((d) => setInstitutions(d.institutions ?? []))
      .catch(() => {})
  }, [])

  // Debounce search input (300ms) to avoid firing on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => clearTimeout(timer)
  }, [filters.search])

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      dateRange: filters.dateRange,
      category: filters.category,
    })
    if (filters.account !== "all") {
      params.set("account", filters.account)
    }
    if (selectedInstitution !== "all") {
      params.set("plaidItemId", selectedInstitution)
    }
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch)
    }

    try {
      const res = await fetch(`/api/transactions?${params}`)
      const data = (await res.json()) as { transactions: TransactionItem[] }
      setTxns(data.transactions ?? [])
    } catch {
      setTxns([])
    } finally {
      setLoading(false)
    }
  }, [
    filters.dateRange,
    filters.category,
    filters.account,
    selectedInstitution,
    debouncedSearch,
  ])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  async function handleToggleRecurring(id: string) {
    setTxns((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, isRecurring: !t.isRecurring } : t,
      ),
    )

    try {
      const res = await fetch(`/api/transactions/${id}/recurring`, {
        method: "PATCH",
      })
      if (!res.ok) {
        setTxns((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, isRecurring: !t.isRecurring } : t,
          ),
        )
      }
    } catch {
      setTxns((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isRecurring: !t.isRecurring } : t,
        ),
      )
    }
  }

  const grouped = groupTransactionsByDate(txns)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex gap-6">
      {/* Desktop: vertical sidebar */}
      {institutions.length > 0 && (
        <AccountSidebar
          institutions={institutions}
          selected={selectedInstitution}
          onSelect={setSelectedInstitution}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Mobile: institution dropdown */}
        {institutions.length > 0 && (
          <div className="md:hidden">
            <Select
              value={selectedInstitution}
              onValueChange={setSelectedInstitution}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <SpendingFilterBar filters={filters} onChange={setFilters} />

        {loading ? (
          <TransactionsLoadingSkeleton />
        ) : txns.length === 0 ? (
          <TransactionsEmptyState />
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <div key={date}>
                <div className="flex items-center justify-between px-3 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDate(date)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dailyTotal(grouped[date])}
                  </span>
                </div>
                <div className="rounded-lg border bg-card divide-y">
                  {grouped[date].map((txn) => (
                    <TransactionRow
                      key={txn.id}
                      transaction={txn}
                      onToggleRecurring={handleToggleRecurring}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function dailyTotal(txns: TransactionItem[]): string {
  const total = txns.reduce((sum, t) => sum + t.amountCents, 0)
  const abs = Math.abs(total)
  const dollars = (abs / 100).toFixed(2)
  return total < 0 ? `-$${dollars}` : `$${dollars}`
}

function TransactionsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-3 space-y-2 animate-pulse">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TransactionsEmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p className="text-sm">
        No transactions found. Connect a bank in Settings or adjust your filters.
      </p>
    </div>
  )
}
