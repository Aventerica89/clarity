"use client"

import { useState, useEffect, useCallback } from "react"
import { Repeat } from "lucide-react"
import { TransactionRow } from "@/components/spending/transaction-row"
import {
  type TransactionItem,
  formatCents,
  getCategoryLabel,
} from "@/types/transaction"

export function RecurringTab() {
  const [txns, setTxns] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecurring = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/transactions?recurring=true&dateRange=all")
      const data = (await res.json()) as { transactions: TransactionItem[] }
      setTxns(data.transactions ?? [])
    } catch {
      setTxns([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecurring()
  }, [fetchRecurring])

  async function handleToggleRecurring(id: string) {
    setTxns((prev) => prev.filter((t) => t.id !== id))

    try {
      const res = await fetch(`/api/transactions/${id}/recurring`, {
        method: "PATCH",
      })
      if (!res.ok) {
        fetchRecurring()
      }
    } catch {
      fetchRecurring()
    }
  }

  // Group by merchant to show unique recurring expenses
  const byMerchant = groupByMerchant(txns)
  const monthlyEstimate = estimateMonthlyBurn(byMerchant)

  if (loading) {
    return <RecurringLoadingSkeleton />
  }

  if (txns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Repeat className="size-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">
          No recurring expenses marked yet. Use the three-dot menu on any
          transaction to mark it as recurring.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="text-xs text-muted-foreground mb-1">
          Estimated monthly burn
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {formatCents(monthlyEstimate)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {byMerchant.length} recurring expense{byMerchant.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {byMerchant.map((group) => (
          <TransactionRow
            key={group.latest.id}
            transaction={group.latest}
            onToggleRecurring={handleToggleRecurring}
          />
        ))}
      </div>
    </div>
  )
}

interface MerchantGroup {
  merchantKey: string
  latest: TransactionItem
  avgAmountCents: number
  count: number
}

function groupByMerchant(txns: TransactionItem[]): MerchantGroup[] {
  const map = new Map<string, TransactionItem[]>()

  for (const txn of txns) {
    const key = (txn.merchantName ?? txn.name).toLowerCase()
    const existing = map.get(key) ?? []
    map.set(key, [...existing, txn])
  }

  const groups: MerchantGroup[] = []

  for (const [merchantKey, items] of map) {
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date))
    const avg = Math.round(
      items.reduce((sum, t) => sum + t.amountCents, 0) / items.length,
    )
    groups.push({
      merchantKey,
      latest: sorted[0],
      avgAmountCents: avg,
      count: items.length,
    })
  }

  return groups.sort((a, b) => b.avgAmountCents - a.avgAmountCents)
}

function estimateMonthlyBurn(groups: MerchantGroup[]): number {
  return groups.reduce((sum, g) => sum + g.avgAmountCents, 0)
}

function RecurringLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 animate-pulse">
        <div className="h-3 w-32 rounded bg-muted mb-2" />
        <div className="h-7 w-24 rounded bg-muted" />
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
