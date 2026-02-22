"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface LifeContextItem {
  id: string
  title: string
  urgency: "active" | "critical"
}

interface FinancialSnap {
  bankBalanceCents: number
  monthlyBurnCents: number
}

interface Props {
  items: LifeContextItem[]
  snapshot: FinancialSnap | null
}

export function LifeContextStrip({ items, snapshot }: Props) {
  const criticalItems = items.filter((i) => i.urgency === "critical")
  const [open, setOpen] = useState(criticalItems.length > 0)

  if (items.length === 0 && !snapshot) return null

  const runway =
    snapshot && snapshot.monthlyBurnCents > 0
      ? (snapshot.bankBalanceCents / snapshot.monthlyBurnCents).toFixed(1)
      : null

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
        <div className="border-t border-border px-4 py-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold uppercase",
                  item.urgency === "critical"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-foreground",
                )}
              >
                {item.urgency}
              </span>
              <span className="text-sm">{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
