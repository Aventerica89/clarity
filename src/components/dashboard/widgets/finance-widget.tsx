"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MonthData {
  month: string
  income: number
  expense: number
}

interface FinanceResponse {
  months: MonthData[]
  avgIncome: number
  avgExpense: number
}

export function FinanceWidget() {
  const [range, setRange] = useState<3 | 6>(6)
  const [data, setData] = useState<FinanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchFinance() {
      setLoading(true)
      try {
        const res = await fetch(`/api/widgets/finance?months=${range}`)
        if (!res.ok) {
          setError(true)
          return
        }
        const json = (await res.json()) as FinanceResponse
        setData(json)
        setError(false)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchFinance()
  }, [range])

  if (error) {
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Income / Expenses
        </div>
        <p className="text-xs text-muted-foreground">
          Connect Plaid in Settings to see spending data.
        </p>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Income / Expenses
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const maxVal = Math.max(...data.months.flatMap((m) => [m.income, m.expense]), 1)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Income / Expenses
        </div>
        <button
          type="button"
          onClick={() => setRange(range === 6 ? 3 : 6)}
          className="rounded border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {range} mo
        </button>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1" style={{ height: 80 }}>
        {data.months.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-stretch gap-px">
            <div className="flex flex-1 items-end gap-px">
              <div
                className="flex-1 rounded-t-sm bg-green-500/70 transition-all hover:bg-green-500"
                style={{ height: `${(m.income / maxVal) * 100}%`, minHeight: 4 }}
                title={`${m.month} Income: $${m.income.toLocaleString()}`}
              />
              <div
                className="flex-1 rounded-t-sm bg-destructive/70 transition-all hover:bg-destructive"
                style={{ height: `${(m.expense / maxVal) * 100}%`, minHeight: 4 }}
                title={`${m.month} Expenses: $${m.expense.toLocaleString()}`}
              />
            </div>
            <div className="text-center text-[9px] text-muted-foreground/60">
              {m.month}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-sm bg-green-500" /> Income
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-sm bg-destructive" /> Expenses
        </span>
      </div>

      {/* Totals */}
      <div className="flex justify-between border-t pt-2 text-xs">
        <div>
          <div className="text-muted-foreground">Avg Income</div>
          <div className="font-semibold text-green-500">
            ${data.avgIncome.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground">Avg Expenses</div>
          <div className="font-semibold text-destructive">
            ${data.avgExpense.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
