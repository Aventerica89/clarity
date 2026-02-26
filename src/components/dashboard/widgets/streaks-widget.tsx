"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StreakData {
  id: string
  title: string
  streak: number
  completedToday: boolean
}

function StreakRing({ streak, max, missed }: { streak: number; max: number; missed: boolean }) {
  const circumference = 2 * Math.PI * 11
  const clamped = Math.min(streak, max)
  const offset = circumference - (clamped / max) * circumference

  return (
    <div className="relative size-7 shrink-0">
      <svg viewBox="0 0 28 28" className="size-full -rotate-90">
        <circle cx={14} cy={14} r={11} className="fill-none stroke-border" strokeWidth={3} />
        <circle
          cx={14} cy={14} r={11}
          className={cn("fill-none", missed ? "stroke-destructive" : "stroke-green-500")}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </div>
  )
}

export function StreaksWidget() {
  const [data, setData] = useState<StreakData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStreaks() {
      try {
        const res = await fetch("/api/widgets/streaks")
        if (!res.ok) return
        const json = (await res.json()) as { routines: StreakData[] }
        setData(json.routines)
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    }
    fetchStreaks()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Routine Streaks
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 rounded-md" />)}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Routine Streaks
        </div>
        <p className="text-xs text-muted-foreground">
          Create routines to track your streaks.
        </p>
      </div>
    )
  }

  // Show top 4 routines
  const shown = data.slice(0, 4)
  const maxStreak = Math.max(...shown.map((s) => s.streak), 14)

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Routine Streaks
      </div>
      <div className="grid grid-cols-2 gap-2">
        {shown.map((routine) => (
          <div
            key={routine.id}
            className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
          >
            <StreakRing
              streak={routine.streak}
              max={maxStreak}
              missed={!routine.completedToday && routine.streak === 0}
            />
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">{routine.title}</div>
              <div className="text-[10px] text-muted-foreground">
                {routine.streak > 0
                  ? `${routine.streak} day streak`
                  : routine.completedToday
                    ? "Done today"
                    : "Missed yesterday"
                }
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
