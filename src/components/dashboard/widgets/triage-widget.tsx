"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface TriageItem {
  id: string
  title: string
  aiScore: number
  source: string
}

function ScoreBadge({ score }: { score: number }) {
  const tier = score >= 70 ? "high" : score >= 40 ? "medium" : "low"
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
        tier === "high" && "bg-clarity-amber/10 text-clarity-amber",
        tier === "medium" && "bg-blue-500/10 text-blue-500",
        tier === "low" && "bg-muted text-muted-foreground",
      )}
    >
      {score}
    </span>
  )
}

export function TriageWidget() {
  const router = useRouter()
  const [items, setItems] = useState<TriageItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTriage() {
      try {
        const res = await fetch("/api/widgets/week?type=triage")
        if (!res.ok) return
        const json = (await res.json()) as { items: TriageItem[] }
        setItems(json.items)
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    }
    fetchTriage()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Triage Inbox
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Triage Inbox
        </div>
        <p className="text-xs text-muted-foreground">
          All clear. No items to triage.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Triage Inbox
        </div>
        <span className="text-[11px] text-muted-foreground">
          {items.length} pending
        </span>
      </div>

      <div className="space-y-0">
        {items.slice(0, 3).map((item, i) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2 py-1.5",
              i > 0 && "border-t border-border/30",
            )}
          >
            <ScoreBadge score={item.aiScore} />
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {item.title}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground/60">
              {item.source}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.push("/triage")}
        className="text-[11px] font-medium text-clarity-amber hover:underline"
      >
        Review all &rarr;
      </button>
    </div>
  )
}
