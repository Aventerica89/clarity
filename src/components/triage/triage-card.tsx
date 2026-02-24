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

export interface TriageItem {
  id: string
  source: string
  sourceId: string
  title: string
  snippet: string
  aiScore: number
  aiReasoning: string
  createdAt: string
}

interface TriageCardProps {
  item: TriageItem
  onApprove: (item: TriageItem) => void
  onDismiss: (id: string) => void
  onPushToContext: (id: string) => void
  onComplete: (id: string) => void
}

export function TriageCard({ item, onApprove, onDismiss, onPushToContext, onComplete }: TriageCardProps) {
  const [loading, setLoading] = useState<"approve" | "dismiss" | "context" | "complete" | null>(null)
  const SourceIcon = SOURCE_ICONS[item.source] ?? Mail
  const isTodoist = item.source === "todoist"

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

  const scoreColor = item.aiScore >= 80
    ? "text-destructive"
    : item.aiScore >= 60
    ? "text-amber-500"
    : "text-muted-foreground"

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
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
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.snippet}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1 italic">
            {item.aiReasoning}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {isTodoist ? (
          <Button
            size="sm"
            className="flex-1"
            onClick={handleComplete}
            disabled={loading !== null}
          >
            <CheckCircle2 className="size-3.5 mr-1.5" />
            {loading === "complete" ? "Completing..." : "Complete"}
          </Button>
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
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
