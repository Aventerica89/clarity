"use client"

import { useState } from "react"
import {
  CheckCircle2,
  X,
  Pin,
  Sparkles,
  ThumbsUp,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SourceBadge } from "./source-badge"
import { getScoreColor } from "./score-color"

const TODOIST_PRIORITIES = [
  { value: 1, label: "P1" },
  { value: 2, label: "P2" },
  { value: 3, label: "P3" },
  { value: 4, label: "P4" },
] as const

const URL_PATTERN = /^https?:\/\/\S+$/i
const MD_LINK_PATTERN = /\[([^\]]+)\]\([^)]+\)/g

function cleanTitle(title: string): string {
  return title.replace(MD_LINK_PATTERN, "$1")
}

function formatSenderName(from: string): string {
  const nameMatch = from.match(/^([^<]+?)(?:\s*<|$)/)
  return nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : from
}

function getGmailDisplayTitle(item: TriageItem): { title: string; subtitle: string | null } {
  if (!URL_PATTERN.test(item.title.trim())) {
    return { title: item.title, subtitle: null }
  }
  const meta = JSON.parse(item.sourceMetadata || "{}") as { from?: string }
  const sender = meta.from ? formatSenderName(meta.from) : null
  return {
    title: sender ? `Email from ${sender}` : "(link shared)",
    subtitle: item.title,
  }
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
  sourceMetadata: string
}

interface TriageCardProps {
  item: TriageItem
  variant?: "compact" | "comfortable"
  onApprove: (item: TriageItem) => void
  onDismiss: (id: string) => void
  onPushToContext: (id: string) => void
  onComplete: (id: string) => void
  onCardClick?: (item: TriageItem) => void
}

export function TriageCard({
  item,
  variant = "comfortable",
  onApprove,
  onDismiss,
  onPushToContext,
  onComplete,
  onCardClick,
}: TriageCardProps) {
  const [loading, setLoading] = useState<
    "approve" | "dismiss" | "context" | "complete" | null
  >(null)
  const isTodoist = item.source === "todoist"
  const currentPriority = isTodoist
    ? (JSON.parse(item.sourceMetadata || "{}") as { priority?: number })
        .priority ?? 1
    : 1
  const [selectedPriority, setSelectedPriority] = useState(currentPriority)
  const isCompact = variant === "compact"
  const isGmail = item.source === "gmail"
  const gmailDisplay = isGmail ? getGmailDisplayTitle(item) : null

  const isOverdue = isTodoist
    ? (() => {
        const meta = JSON.parse(item.sourceMetadata || "{}") as {
          due?: string
        }
        if (!meta.due) return false
        return new Date(meta.due) < new Date()
      })()
    : false

  async function handleAction(
    action: "dismiss" | "complete" | "approve" | "push_to_context",
    callback: () => void
  ) {
    const key = action === "push_to_context" ? "context" : action
    setLoading(key as typeof loading)
    try {
      const body: Record<string, unknown> = { action }
      if (
        action === "approve" &&
        isTodoist &&
        selectedPriority !== currentPriority
      ) {
        body.priority = selectedPriority
      }
      const res = await fetch(`/api/triage/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      callback()
    } catch (err) {
      console.error(`[triage] ${action} error:`, err)
    } finally {
      setLoading(null)
    }
  }

  const scoreColor = getScoreColor(item.aiScore)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onCardClick?.(item)
    }
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-[16px] border bg-background",
        "flex-col sm:flex-row"
      )}
    >
      {/* -- Left Panel: Content -- */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-3.5",
          isCompact ? "p-4" : "px-6 py-5",
          onCardClick && "cursor-pointer"
        )}
        onClick={() => onCardClick?.(item)}
        onKeyDown={onCardClick ? handleKeyDown : undefined}
        role={onCardClick ? "button" : undefined}
        tabIndex={onCardClick ? 0 : undefined}
      >
        {/* Source Row */}
        <div className="flex items-center gap-1.5">
          <SourceBadge source={item.source} />
          {isGmail && (() => {
            const meta = JSON.parse(item.sourceMetadata || "{}") as { from?: string }
            const sender = meta.from ? formatSenderName(meta.from) : null
            return sender ? (
              <>
                <span className="text-xs text-muted-foreground/60">·</span>
                <span className="truncate text-xs text-muted-foreground">{sender}</span>
              </>
            ) : null
          })()}
          {isOverdue && (
            <>
              <span className="text-xs text-muted-foreground/60">·</span>
              <span className="text-xs font-medium text-destructive">
                Overdue
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <p className="text-[16px] font-semibold leading-snug text-foreground">
          {gmailDisplay ? gmailDisplay.title : cleanTitle(item.title)}
        </p>

        {/* URL subtitle (Gmail URL-only subjects) */}
        {gmailDisplay?.subtitle && (
          <p className="truncate text-[13px] text-muted-foreground/60">
            {gmailDisplay.subtitle}
          </p>
        )}

        {/* Snippet */}
        {item.snippet && (
          <p
            className={cn(
              "break-all text-[13px] leading-[1.45] text-muted-foreground",
              isCompact ? "line-clamp-1" : "line-clamp-2"
            )}
          >
            {item.snippet}
          </p>
        )}

        {/* Priority Pills (Todoist only) */}
        {isTodoist && (
          <div className="flex gap-1.5" role="group" aria-label="Priority selection">
            {TODOIST_PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedPriority(p.value) }}
                aria-pressed={selectedPriority === p.value}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  selectedPriority === p.value
                    ? "border-[1.5px] border-foreground bg-muted text-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* View details link */}
        {onCardClick && (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground/60 transition-colors hover:text-foreground">
            View details
            <ChevronRight className="size-3" />
          </span>
        )}
      </div>

      {/* -- Right Panel: AI + Actions -- */}
      <div
        className={cn(
          "flex shrink-0 flex-col justify-between gap-4 bg-muted p-5",
          "sm:w-[200px] sm:rounded-r-[16px]"
        )}
      >
        {/* AI Analysis Section */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              AI Analysis
            </span>
          </div>
          {item.aiReasoning && (
            <p className="text-xs italic leading-[1.4] text-muted-foreground">
              {item.aiReasoning}
            </p>
          )}
          <span className={cn("font-mono text-[32px] font-bold", scoreColor)}>
            {item.aiScore}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5">
          {isTodoist ? (
            <>
              {/* Complete */}
              <Button
                className="h-9 rounded-[10px] text-sm font-semibold"
                onClick={() =>
                  handleAction("complete", () => onComplete(item.id))
                }
                disabled={loading !== null}
                aria-label="Complete task"
              >
                <CheckCircle2 className="size-[15px]" />
                {loading === "complete" ? <Loader2 className="size-4 animate-spin" /> : "Complete"}
              </Button>
              {/* Approve */}
              <Button
                variant="outline"
                className="h-9 rounded-[10px] text-sm font-medium"
                onClick={() =>
                  handleAction("approve", () => onApprove(item))
                }
                disabled={loading !== null}
                aria-label="Approve task"
              >
                <ThumbsUp className="size-[15px]" />
                {loading === "approve" ? <Loader2 className="size-4 animate-spin" /> : "Approve"}
              </Button>
            </>
          ) : (
            <Button
              className="h-9 rounded-[10px] text-sm font-semibold"
              onClick={() => handleAction("approve", () => onApprove(item))}
              disabled={loading !== null}
              aria-label="Add to Todoist"
            >
              <CheckCircle2 className="size-[15px]" />
              Add to Todoist
            </Button>
          )}
          {/* Pin (Push to Context) */}
          <Button
            variant="outline"
            className="h-9 rounded-[10px] text-sm font-medium"
            onClick={() =>
              handleAction("push_to_context", () => onPushToContext(item.id))
            }
            disabled={loading !== null}
            aria-label="Pin to context"
          >
            <Pin className="size-[15px]" />
            {loading === "context" ? <Loader2 className="size-4 animate-spin" /> : "Pin"}
          </Button>
          {/* Dismiss */}
          <Button
            variant="ghost"
            className="h-9 rounded-[10px] text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() =>
              handleAction("dismiss", () => onDismiss(item.id))
            }
            disabled={loading !== null}
            aria-label="Dismiss item"
          >
            <X className="size-[15px]" />
            {loading === "dismiss" ? <Loader2 className="size-4 animate-spin" /> : "Dismiss"}
          </Button>
        </div>
      </div>
    </div>
  )
}
