"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface RunwayData {
  months: number
  savingsCents: number
  burnCents: number
}

function GaugeRing({ months }: { months: number }) {
  // 12 months = full ring, clamp to 0-12 range
  const clamped = Math.min(Math.max(months, 0), 12)
  const circumference = 2 * Math.PI * 28
  const offset = circumference - (clamped / 12) * circumference

  const color = months >= 6 ? "stroke-green-500" : months >= 3 ? "stroke-clarity-amber" : "stroke-destructive"

  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx={32} cy={32} r={28}
          className="fill-none stroke-border"
          strokeWidth={6}
        />
        <circle
          cx={32} cy={32} r={28}
          className={`fill-none ${color}`}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold leading-none">{months.toFixed(1)}</span>
        <span className="text-[9px] text-muted-foreground">months</span>
      </div>
    </div>
  )
}

export function RunwayWidget() {
  const [data, setData] = useState<RunwayData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRunway() {
      try {
        const res = await fetch("/api/widgets/finance?type=runway")
        if (!res.ok) return
        const json = (await res.json()) as RunwayData
        setData(json)
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    }
    fetchRunway()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Financial Runway
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Financial Runway
        </div>
        <p className="text-xs text-muted-foreground">
          Add your financial snapshot in Settings to see runway.
        </p>
      </div>
    )
  }

  const savings = data.savingsCents / 100
  const burn = data.burnCents / 100
  const status = data.months >= 6 ? "Comfortable" : data.months >= 3 ? "Safe above 3 mo" : "Needs attention"

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Financial Runway
      </div>
      <div className="flex items-center gap-4">
        <GaugeRing months={data.months} />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <div><strong className="text-foreground">${savings.toLocaleString()}</strong> liquid savings</div>
          <div><strong className="text-foreground">${burn.toLocaleString()}</strong>/mo avg burn</div>
          <div className="text-muted-foreground">{status}</div>
        </div>
      </div>
    </div>
  )
}
