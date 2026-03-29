"use client"

import { Bell, BellOff, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ScheduleEntry } from "@/lib/day-structure/types"

interface ScheduleTimelineProps {
  entries: ScheduleEntry[]
  templateName: string
  className?: string
}

function entryIcon(type: ScheduleEntry["type"]) {
  switch (type) {
    case "alarm":
      return <Bell className="size-3.5" />
    case "reminder":
      return <BellOff className="size-3.5" />
    case "checklist_start":
      return <ListChecks className="size-3.5" />
  }
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

export function ScheduleTimeline({ entries, templateName, className }: ScheduleTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No schedule entries for today.</p>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground mb-3">
        Template: <span className="font-medium text-foreground">{templateName}</span>
      </p>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[59px] top-1 bottom-1 w-px bg-border" />

        {entries.map((entry, i) => (
          <div
            key={`${entry.time}-${entry.label}-${i}`}
            className="flex items-center gap-3 py-1.5 group"
          >
            <span className="w-[50px] text-right text-xs font-mono text-muted-foreground tabular-nums">
              {formatTime12(entry.time)}
            </span>

            <div
              className={cn(
                "relative z-10 flex size-5 items-center justify-center rounded-full border",
                entry.type === "alarm"
                  ? "border-clarity-amber bg-clarity-amber/10 text-clarity-amber"
                  : entry.type === "checklist_start"
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-500"
                    : "border-border bg-muted text-muted-foreground",
              )}
            >
              {entryIcon(entry.type)}
            </div>

            <span
              className={cn(
                "text-sm",
                entry.type === "alarm" ? "font-medium" : "text-muted-foreground",
              )}
            >
              {entry.label}
            </span>

            <span className="ml-auto text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {entry.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
