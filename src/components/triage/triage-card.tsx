"use client"

import { useState } from "react"
import { CheckCircle2, X, ArrowUpCircle, Mail, Calendar, CheckSquare, ListTodo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SOURCE_ICONS: Record<string, React.ElementType> = {
  gmail: Mail,
  google_calendar: Calendar,
  todoist: CheckSquare,
  google_tasks: ListTodo,
}

const SOURCE_LABELS: Record<string, string> = {
  gmail: "Gmail",
  google_calendar: "Calendar",
  todoist: "Todoist",
  google_tasks: "Google Tasks",
}

const TODOIST_PRIORITIES = [
  { value: 1, label: "P1", color: "bg-muted text-muted-foreground" },
  { value: 2, label: "P2", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  { value: 3, label: "P3", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  { value: 4, label: "P4", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
] as const

export interface TriageItem {
  id: string
  source: string
  sourceId: string
  title: string
  snippet: string
  aiScore: number
  aiReasoning: string
  createdAt: string
  sourceMetadata: string
}

interface TriageCardProps {
  item: TriageItem
  variant?: "compact" | "comfortable"
  onApprove: (item: TriageItem) => void
  onDismiss: (id: string) => void
  onPushToContext: (id: string) => void
  onComplete: (id: string) => void
}

export function TriageCard({
  item,
  variant = "comfortable",
  onApprove,
  onDismiss,
  onPushToContext,
  onComplete,
}: TriageCardProps) {
  const [loading, setLoading] = useState<"approve" | "dismiss" | "context" | "complete" | null>(null)
  const SourceIcon = SOURCE_ICONS[item.source] ?? Mail
  const isTodoist = item.source === "todoist"
  const currentPriority = isTodoist
    ? (JSON.parse(item.sourceMetadata || "{}") as { priority?: number }).priority ?? 1
    : 1
  const [selectedPriority, setSelectedPriority] = useState(currentPriority)
  const isCompact = variant === "compact"

  async function handleDismiss() {
    setLoading("dismiss")
    await fetch(`/api/triage/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    })
    onDismiss(item.id)
    setLoading(null)
  }

  async function handlePushToContext() {
    setLoading("context")
    await fetch(`/api/triage/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push_to_context" }),
    })
    onPushToContext(item.id)
    setLoading(null)
  }

  async function handleComplete() {
    setLoading("complete")
    await fetch(`/api/triage/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    })
    onComplete(item.id)
    setLoading(null)
  }

  async function handleApprove() {
    setLoading("approve")
    await fetch(`/api/triage/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        ...(isTodoist && selectedPriority !== currentPriority
          ? { priority: selectedPriority }
          : {}),
      }),
    })
    onComplete(item.id)
    setLoading(null)
  }

  const scoreColor = item.aiScore >= 80
    ? "text-destructive"
    : item.aiScore >= 60
    ? "text-amber-500"
    : "text-muted-foreground"

  return (
    <div className={cn("rounded-lg border bg-card space-y-3", isCompact ? "p-3" : "p-4")}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <SourceIcon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-normal">
              {SOURCE_LABELS[item.source] ?? item.source}
            </Badge>
            <span className={cn("text-xs font-medium", scoreColor)}>
              {item.aiScore}/100
            </span>
          </div>
          <p className="font-medium text-sm leading-snug">{item.title}</p>
          {item.snippet && (
            <p className={cn("text-xs text-muted-foreground mt-1", isCompact ? "line-clamp-1" : "line-clamp-2")}>
              {item.snippet}
            </p>
          )}
          <p className={cn("text-xs text-muted-foreground/70 mt-1 italic", isCompact && "hidden")}>
            {item.aiReasoning}
          </p>
          {isTodoist && (
            <div className="flex gap-1.5 mt-2">
              {TODOIST_PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSelectedPriority(p.value)}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium transition-all",
                    p.color,
                    selectedPriority === p.value
                      ? "ring-2 ring-ring ring-offset-1"
                      : "opacity-50 hover:opacity-75"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {isTodoist ? (
          <>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleComplete}
              disabled={loading !== null}
            >
              <CheckCircle2 className="size-3.5 mr-1.5" />
              {loading === "complete" ? "Completing..." : "Complete"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleApprove}
              disabled={loading !== null}
            >
              {loading === "approve" ? "Approving..." : "Approve"}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onApprove(item)}
            disabled={loading !== null}
          >
            <CheckCircle2 className="size-3.5 mr-1.5" />
            Add to Todoist
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handlePushToContext}
          disabled={loading !== null}
        >
          <ArrowUpCircle className="size-3.5 mr-1.5" />
          Context
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          disabled={loading !== null}
        >
          <X className="size-3.5 mr-1" />
          {loading === "dismiss" ? "Dismissing..." : "Dismiss"}
        </Button>
      </div>
    </div>
  )
}
