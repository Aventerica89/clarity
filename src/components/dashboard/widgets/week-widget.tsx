"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface WeekData {
  completed: number
  total: number
  overdue: number
  remaining: number
}

export function WeekWidget() {
  const [data, setData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWeek() {
      try {
        const res = await fetch("/api/widgets/week")
        if (!res.ok) return
        const json = (await res.json()) as WeekData
        setData(json)
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    }
    fetchWeek()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          This Week
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          This Week
        </div>
        <p className="text-xs text-muted-foreground">No task data available.</p>
      </div>
    )
  }

  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        This Week
      </div>

      <div className="flex items-baseline justify-between text-xs">
        <span>
          <strong className="text-foreground">{data.completed}</strong> completed
        </span>
        <span className="text-muted-foreground">of {data.total} tasks</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-3 text-[11px] text-muted-foreground">
        {data.overdue > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-destructive" />
            {data.overdue} overdue
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-amber-400" />
          {data.remaining} remaining
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-green-500" />
          {data.completed} done
        </span>
      </div>
    </div>
  )
}
