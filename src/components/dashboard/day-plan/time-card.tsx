"use client"

import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimeBlock, PlanItem } from "@/lib/ai/plan-parser"

const PERIOD_COLORS = {
  morning: "bg-amber-400",
  afternoon: "bg-orange-400",
  evening: "bg-indigo-400",
} as const

const SOURCE_LABELS: Record<string, { label: string; accent: boolean }> = {
  priority: { label: "Priority", accent: true },
  calendar: { label: "Calendar", accent: false },
  todoist: { label: "Todoist", accent: false },
  routine: { label: "Routine", accent: false },
  gmail: { label: "Gmail", accent: false },
  manual: { label: "Manual", accent: false },
}

function getCurrentPeriod(): "morning" | "afternoon" | "evening" {
  const hour = new Date().toLocaleString("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "America/Phoenix",
  })
  const h = parseInt(hour, 10)
  if (h < 12) return "morning"
  if (h < 18) return "afternoon"
  return "evening"
}

function isPastPeriod(period: "morning" | "afternoon" | "evening"): boolean {
  const current = getCurrentPeriod()
  const order = ["morning", "afternoon", "evening"]
  return order.indexOf(period) < order.indexOf(current)
}

function PlanItemRow({ item }: { item: PlanItem }) {
  const sourceInfo = SOURCE_LABELS[item.source] ?? SOURCE_LABELS.manual

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 py-1.5",
        item.isPriority && "rounded-r-md border-l-[3px] border-clarity-amber bg-clarity-amber/10 -ml-3 pl-2.5 py-2",
      )}
    >
      {item.time && (
        <span className="w-[60px] shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
          {item.time}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-snug">{item.title}</div>
        {(item.meta || item.source) && (
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {item.meta && <span>{item.meta}</span>}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium uppercase tracking-wider",
                sourceInfo.accent
                  ? "bg-clarity-amber/10 text-clarity-amber"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {sourceInfo.label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function TimeCard({ block }: { block: TimeBlock }) {
  const [collapsed, setCollapsed] = useState(false)
  const isCurrent = getCurrentPeriod() === block.period
  const isPast = isPastPeriod(block.period)

  // Auto-collapse past time periods
  useEffect(() => {
    if (isPast && block.items.length > 0) {
      setCollapsed(true)
    }
  }, [isPast, block.items.length])

  if (block.items.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-colors",
        isCurrent && "border-clarity-amber/30",
        !isCurrent && !isPast && "border-border",
        isPast && "border-border/50 opacity-75",
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2.5 px-4 py-3"
      >
        <span className={cn("size-2 shrink-0 rounded-full", PERIOD_COLORS[block.period])} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {block.label}
        </span>
        <span className="rounded-full bg-muted px-2 py-px text-[11px] text-muted-foreground">
          {block.items.length}
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {block.range}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            collapsed && "-rotate-90",
          )}
        />
      </button>

      {!collapsed && (
        <div className="space-y-0 border-t px-4 pb-3 pt-1">
          {block.items.map((item, i) => (
            <div key={i}>
              {i > 0 && !item.isPriority && <div className="border-t border-border/30" />}
              <PlanItemRow item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
