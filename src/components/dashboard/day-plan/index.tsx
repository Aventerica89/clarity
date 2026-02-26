"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TimeCard } from "./time-card"
import { HorizonCards } from "./horizon-cards"
import { PlanFooter } from "./plan-footer"
import { SuggestionChips } from "./suggestion-chips"
import { parseDayPlan, type ParsedPlan } from "@/lib/ai/plan-parser"

type ModelChoice = "haiku" | "sonnet"

interface RawPlan {
  todayPlan: string
  horizon: string
  model: string
  generatedAt: string | Date
}

const MODEL_STORAGE_KEY = "clarity-day-plan-model"

function getStoredModel(): ModelChoice {
  if (typeof window === "undefined") return "sonnet"
  const stored = localStorage.getItem(MODEL_STORAGE_KEY)
  return stored === "haiku" ? "haiku" : "sonnet"
}

export function DayPlanV3() {
  const [rawPlan, setRawPlan] = useState<RawPlan | null>(null)
  const [parsed, setParsed] = useState<ParsedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [model, setModel] = useState<ModelChoice>("sonnet")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setModel(getStoredModel())
  }, [])

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/day-plan")
      if (!res.ok) return
      const data = (await res.json()) as { plan: RawPlan | null }
      if (data.plan) {
        setRawPlan(data.plan)
        setParsed(parseDayPlan(data.plan.todayPlan, data.plan.horizon))
      }
    } catch {
      // Silent fail on initial load
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  // Auto-generate if no cached plan
  useEffect(() => {
    if (!loading && !rawPlan && !generating) {
      generatePlan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rawPlan])

  async function generatePlan() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/day-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "Failed to generate plan")
        return
      }
      const data = (await res.json()) as { plan: RawPlan }
      setRawPlan(data.plan)
      setParsed(parseDayPlan(data.plan.todayPlan, data.plan.horizon))
    } catch {
      setError("Network error generating plan")
    } finally {
      setGenerating(false)
    }
  }

  function handleModelChange(m: ModelChoice) {
    setModel(m)
    localStorage.setItem(MODEL_STORAGE_KEY, m)
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Suggestion chips */}
      <SuggestionChips />

      {/* Time blocks */}
      {generating ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>
              Generating plan with {model === "haiku" ? "Haiku" : "Sonnet"}...
            </span>
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={generatePlan}>
            Retry
          </Button>
        </div>
      ) : parsed ? (
        <>
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your Plan
            </h2>
            {parsed.timeBlocks.map((block) => (
              <TimeCard key={block.period} block={block} />
            ))}
          </div>

          <PlanFooter
            model={model}
            onModelChange={handleModelChange}
            onRegenerate={generatePlan}
            generating={generating}
            generatedAt={rawPlan?.generatedAt}
            planModel={rawPlan?.model}
          />

          {parsed.horizon.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Next 3 Days
              </h2>
              <HorizonCards days={parsed.horizon} />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No plan generated yet.
        </p>
      )}
    </div>
  )
}
