"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface LifeContextItem {
  id: string
  title: string
  urgency: "monitoring" | "active" | "escalated" | "critical" | "resolved"
}

interface FinancialSnap {
  bankBalanceCents: number
  monthlyBurnCents: number
}

interface Props {
  items: LifeContextItem[]
  snapshot: FinancialSnap | null
}

const URGENCY_ORDER = ["critical", "escalated", "active", "monitoring", "resolved"] as const

const URGENCY_STYLES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  escalated: "bg-warning/10 text-warning border-warning/20",
  active: "bg-muted text-foreground border-border",
  monitoring: "bg-muted/60 text-muted-foreground border-border",
  resolved: "bg-muted/40 text-muted-foreground/60 border-border",
}

const PAGE_SIZE = 6

export function LifeContextStrip({ items, snapshot }: Props) {
  const criticalItems = items.filter((i) => i.urgency === "critical")
  const [open, setOpen] = useState(criticalItems.length > 0)
  const [filter, setFilter] = useState("all")
  const [page, setPage] = useState(1)

  if (items.length === 0 && !snapshot) return null

  const runway =
    snapshot && snapshot.monthlyBurnCents > 0
      ? (snapshot.bankBalanceCents / snapshot.monthlyBurnCents).toFixed(1)
      : null

  const presentLevels = URGENCY_ORDER.filter((u) => items.some((i) => i.urgency === u))
  const filtered = filter === "all" ? items : items.filter((i) => i.urgency === filter)
  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > visible.length

  function handleFilter(value: string) {
    setFilter(value)
    setPage(1)
  }

  return (
    <div className="rounded-md border border-border bg-muted/20 text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
        <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
          Life Context
        </span>
        {criticalItems.length > 0 && (
          <span className="flex items-center gap-1 text-destructive text-xs">
            <AlertTriangle className="size-3" />
            {criticalItems.length} critical
          </span>
        )}
        {runway && (
          <span className="ml-auto text-xs text-muted-foreground">
            Runway: ~{runway} mo
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {presentLevels.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleFilter("all")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  filter === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              {presentLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => handleFilter(level)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                    filter === level
                      ? URGENCY_STYLES[level]
                      : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {visible.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-md border px-3 py-2",
                  URGENCY_STYLES[item.urgency] ?? "bg-muted border-border",
                )}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-0.5">
                  {item.urgency}
                </span>
                <span className="text-xs leading-snug">{item.title}</span>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
