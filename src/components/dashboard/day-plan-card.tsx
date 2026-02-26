"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type ModelChoice = "haiku" | "sonnet"

interface DayPlan {
  todayPlan: string
  horizon: string
  model: string
  generatedAt: string | Date
}

const MODEL_STORAGE_KEY = "clarity-day-plan-model"

function getStoredModel(): ModelChoice {
  if (typeof window === "undefined") return "haiku"
  const stored = localStorage.getItem(MODEL_STORAGE_KEY)
  return stored === "sonnet" ? "sonnet" : "haiku"
}

function formatGeneratedAt(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Phoenix",
  })
}

function renderMarkdown(md: string): React.ReactNode[] {
  return md.split("\n").map((line, i) => {
    const trimmed = line.trim()

    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={i} className="text-sm font-semibold mt-3 first:mt-0">
          {trimmed.slice(3)}
        </h3>
      )
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={i} className="text-xs font-semibold mt-2 text-muted-foreground uppercase tracking-wide">
          {trimmed.slice(4)}
        </h4>
      )
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.slice(2)
      return (
        <div key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className="shrink-0 text-muted-foreground mt-0.5">&bull;</span>
          <span>{renderInline(content)}</span>
        </div>
      )
    }

    if (trimmed === "") return <div key={i} className="h-1" />

    return (
      <p key={i} className="text-sm leading-relaxed">
        {renderInline(trimmed)}
      </p>
    )
  })
}

function renderInline(text: string): React.ReactNode {
  // Simple bold rendering: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export function DayPlanCard() {
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [model, setModel] = useState<ModelChoice>("haiku")
  const [error, setError] = useState<string | null>(null)
  const [horizonOpen, setHorizonOpen] = useState(false)

  // Load stored model preference on mount
  useEffect(() => {
    setModel(getStoredModel())
  }, [])

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/day-plan")
      if (!res.ok) return
      const data = (await res.json()) as { plan: DayPlan | null }
      setPlan(data.plan)
    } catch {
      // Silent fail on initial load
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch cached plan on mount
  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  // Auto-generate if no cached plan exists
  useEffect(() => {
    if (!loading && !plan && !generating) {
      generatePlan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, plan])

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
      const data = (await res.json()) as { plan: DayPlan }
      setPlan(data.plan)
    } catch {
      setError("Network error generating plan")
    } finally {
      setGenerating(false)
    }
  }

  function handleModelChange(value: string) {
    const m = value as ModelChoice
    setModel(m)
    localStorage.setItem(MODEL_STORAGE_KEY, m)
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Today plan section */}
      <div className="p-4 space-y-2">
        {generating ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>
                Generating plan with{" "}
                {model === "haiku" ? "Haiku" : "Sonnet"}...
              </span>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={generatePlan}
            >
              Retry
            </Button>
          </div>
        ) : plan ? (
          <>
            <div className="space-y-1">
              {renderMarkdown(plan.todayPlan)}
            </div>

            {/* 3-day horizon (collapsible) */}
            {plan.horizon && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setHorizonOpen(!horizonOpen)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium",
                    "text-muted-foreground hover:text-foreground transition-colors",
                  )}
                >
                  {horizonOpen ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                  Next 3 Days
                </button>
                {horizonOpen && (
                  <div className="mt-2 space-y-1 pl-0.5">
                    {renderMarkdown(plan.horizon)}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No plan generated yet.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-4 py-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="size-3" />
          {plan && (
            <span>
              {formatGeneratedAt(plan.generatedAt)} &middot;{" "}
              {plan.model === "sonnet" ? "Sonnet" : "Haiku"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="haiku">Haiku</SelectItem>
              <SelectItem value="sonnet">Sonnet</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={generatePlan}
            disabled={generating}
            aria-label="Regenerate plan"
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
