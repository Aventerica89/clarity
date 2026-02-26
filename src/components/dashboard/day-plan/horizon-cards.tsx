"use client"

import { cn } from "@/lib/utils"
import type { HorizonDay } from "@/lib/ai/plan-parser"

const TYPE_BULLET: Record<string, { color: string; char: string }> = {
  event: { color: "text-clarity-amber", char: "\u25CF" },
  task: { color: "text-muted-foreground", char: "\u2022" },
  deadline: { color: "text-destructive", char: "\u25CF" },
  clear: { color: "text-muted-foreground", char: "\u25CB" },
}

export function HorizonCards({ days }: { days: HorizonDay[] }) {
  if (days.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
      {days.map((day) => (
        <div
          key={day.dayName}
          className="rounded-lg border bg-card p-3.5 transition-colors hover:border-border/80"
        >
          <div className="text-[13px] font-semibold">{day.dayName}</div>
          <div className="mb-2.5 font-mono text-[11px] text-muted-foreground">
            {day.date}
          </div>
          <div className="space-y-1.5">
            {day.items.map((item, i) => {
              const bullet = TYPE_BULLET[item.type] ?? TYPE_BULLET.task
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-1.5 text-xs leading-snug",
                    item.type === "clear" && "italic text-muted-foreground",
                    item.type !== "clear" && "text-muted-foreground",
                  )}
                >
                  <span className={cn("mt-px shrink-0", bullet.color)}>
                    {bullet.char}
                  </span>
                  <span>{item.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
