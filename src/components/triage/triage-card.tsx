"use client"

import { useMemo, useState } from "react"
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
import { SourceBadge } from "@/components/tasks/source-badge"
import { getScoreColor } from "./score-color"
import {
  type TriageItem,
  TODOIST_PRIORITIES,
  cleanTitle,
  formatSenderName,
  getGmailDisplayTitle,
  parseSourceMetadata,
} from "@/types/triage"

// Re-export for backwards compatibility
export type { TriageItem } from "@/types/triage"
export { cleanTitle, formatSenderName, getGmailDisplayTitle, TODOIST_PRIORITIES } from "@/types/triage"

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
  const isTodoist = item.source === "todoist"
  const isCompact = variant === "compact"
  const isGmail = item.source === "gmail"

  const meta = useMemo(() => parseSourceMetadata(item.sourceMetadata), [item.sourceMetadata])
  const currentPriority = isTodoist ? (meta.priority ?? 1) : 1
  const isOverdue = isTodoist && meta.due ? new Date(meta.due) < new Date() : false
  const sender = isGmail && meta.from ? formatSenderName(meta.from) : null
  const gmailDisplay = isGmail ? getGmailDisplayTitle(item) : null

  const [selectedPriority, setSelectedPriority] = useState(currentPriority)
  const [loading, setLoading] = useState<"approve" | "dismiss" | "context" | "complete" | null>(null)

  const scoreColor = getScoreColor(item.aiScore)

  async function handleAction(
    key: "approve" | "dismiss" | "context" | "complete",
    callback: () => void
  ) {
    setLoading(key)
    try {
      await Promise.resolve(callback())
    } finally {
      setLoading(null)
    }
  }

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
          {sender && (
            <>
              <span className="text-xs text-muted-foreground/60">·</span>
              <span className="truncate text-xs text-muted-foreground">{sender}</span>
            </>
          )}
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
              <Button
                className="h-9 rounded-[10px] text-sm font-semibold"
                onClick={() => handleAction("complete", () => onComplete(item.id))}
                disabled={loading !== null}
                aria-label="Complete task"
              >
                <CheckCircle2 className="size-[15px]" />
                {loading === "complete" ? <Loader2 className="size-4 animate-spin" /> : "Complete"}
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-[10px] text-sm font-medium"
                onClick={() => handleAction("approve", () => onApprove(item))}
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
          <Button
            variant="outline"
            className="h-9 rounded-[10px] text-sm font-medium"
            onClick={() => handleAction("context", () => onPushToContext(item.id))}
            disabled={loading !== null}
            aria-label="Pin to context"
          >
            <Pin className="size-[15px]" />
            {loading === "context" ? <Loader2 className="size-4 animate-spin" /> : "Pin"}
          </Button>
          <Button
            variant="ghost"
            className="h-9 rounded-[10px] text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => handleAction("dismiss", () => onDismiss(item.id))}
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
