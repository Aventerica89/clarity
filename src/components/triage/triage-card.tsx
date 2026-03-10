"use client"

import { useState } from "react"
import {
  CheckCircle2,
  X,
  Pin,
  Mail,
  Calendar,
  CheckSquare,
  ListTodo,
  Sparkles,
  ThumbsUp,
} from "lucide-react"
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

const SOURCE_COLORS: Record<string, string> = {
  todoist: "text-[#E44332]",
  gmail: "text-[#4285F4]",
  google_calendar: "text-[#4285F4]",
  google_tasks: "text-[#4285F4]",
}

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
  preview?: boolean
  onApprove: (item: TriageItem) => void
  onDismiss: (id: string) => void
  onPushToContext: (id: string) => void
  onComplete: (id: string) => void
}

export function TriageCard({
  item,
  variant = "comfortable",
  preview = false,
  onApprove,
  onDismiss,
  onPushToContext,
  onComplete,
}: TriageCardProps) {
  const [loading, setLoading] = useState<
    "approve" | "dismiss" | "context" | "complete" | null
  >(null)
  const SourceIcon = SOURCE_ICONS[item.source] ?? Mail
  const sourceColor = SOURCE_COLORS[item.source] ?? "text-muted-foreground"
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
    if (preview) {
      callback()
      return
    }
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

  const scoreColor =
    item.aiScore >= 80
      ? "text-[#E85A4F]"
      : item.aiScore >= 60
        ? "text-[#C9A53E]"
        : "text-[#8A8A8A]"

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-[16px] border border-[#EFEFEF] bg-white",
        isCompact ? "flex-col sm:flex-row" : "flex-col sm:flex-row"
      )}
    >
      {/* ── Left Panel: Content ── */}
      <div
        className={cn(
          "flex flex-1 flex-col gap-3.5",
          isCompact ? "p-4" : "px-6 py-5"
        )}
      >
        {/* Source Row */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-lg border border-[#EFEFEF] px-2 py-0.5">
            <SourceIcon className={cn("size-3", sourceColor)} />
            <span className="text-xs text-[#1E2432]">
              {SOURCE_LABELS[item.source] ?? item.source}
            </span>
          </span>
          {isGmail && (() => {
            const meta = JSON.parse(item.sourceMetadata || "{}") as { from?: string }
            const sender = meta.from ? formatSenderName(meta.from) : null
            return sender ? (
              <>
                <span className="text-xs text-[#ABABAB]">·</span>
                <span className="truncate text-xs text-[#8A8A8A]">{sender}</span>
              </>
            ) : null
          })()}
          {isOverdue && (
            <>
              <span className="text-xs text-[#ABABAB]">·</span>
              <span className="text-xs font-medium text-[#E5484D]">
                Overdue
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <p className="text-[16px] font-semibold leading-snug text-[#1E2432]">
          {gmailDisplay ? gmailDisplay.title : cleanTitle(item.title)}
        </p>

        {/* URL subtitle (Gmail URL-only subjects) */}
        {gmailDisplay?.subtitle && (
          <p className="truncate text-[13px] text-[#ABABAB]">
            {gmailDisplay.subtitle}
          </p>
        )}

        {/* Snippet */}
        {item.snippet && (
          <p
            className={cn(
              "text-[13px] leading-[1.45] text-[#8A8A8A]",
              isCompact ? "line-clamp-1" : "line-clamp-2"
            )}
          >
            {item.snippet}
          </p>
        )}

        {/* AI Reasoning (left panel, compact) */}
        {!isCompact && item.aiReasoning && (
          <p className="text-xs italic text-[#ABABAB]">{item.aiReasoning}</p>
        )}

        {/* Priority Pills (Todoist only) */}
        {isTodoist && (
          <div className="flex gap-1.5">
            {TODOIST_PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setSelectedPriority(p.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  selectedPriority === p.value
                    ? "border-[1.5px] border-[#1E2432] bg-[#F5F4F2] text-[#1E2432]"
                    : "bg-[#F5F4F2] text-[#8A8A8A] hover:text-[#1E2432]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right Panel: AI + Actions ── */}
      <div
        className={cn(
          "flex shrink-0 flex-col justify-between gap-4 bg-[#F5F4F2] p-5",
          "sm:w-[200px] sm:rounded-r-[16px]"
        )}
      >
        {/* AI Analysis Section */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#8A8A8A]" />
            <span className="text-sm font-semibold text-[#1E2432]">
              AI Analysis
            </span>
          </div>
          {item.aiReasoning && (
            <p className="text-xs italic leading-[1.4] text-[#8A8A8A]">
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
              <button
                type="button"
                className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#1E2432] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2a3347] disabled:opacity-50"
                onClick={() =>
                  handleAction("complete", () => onComplete(item.id))
                }
                disabled={loading !== null}
              >
                <CheckCircle2 className="size-[15px]" />
                {loading === "complete" ? "..." : "Complete"}
              </button>
              {/* Approve */}
              <button
                type="button"
                className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#E8E8E8] px-4 text-sm font-medium text-[#1E2432] transition-colors hover:bg-[#EAEAEA] disabled:opacity-50"
                onClick={() =>
                  handleAction("approve", () => onApprove(item))
                }
                disabled={loading !== null}
              >
                <ThumbsUp className="size-[15px] text-[#8A8A8A]" />
                {loading === "approve" ? "..." : "Approve"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#1E2432] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2a3347] disabled:opacity-50"
              onClick={() => handleAction("approve", () => onApprove(item))}
              disabled={loading !== null}
            >
              <CheckCircle2 className="size-[15px]" />
              Add to Todoist
            </button>
          )}
          {/* Pin (Push to Context) */}
          <button
            type="button"
            className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#E8E8E8] px-4 text-sm font-medium text-[#1E2432] transition-colors hover:bg-[#EAEAEA] disabled:opacity-50"
            onClick={() =>
              handleAction("push_to_context", () => onPushToContext(item.id))
            }
            disabled={loading !== null}
          >
            <Pin className="size-[15px] text-[#8A8A8A]" />
            {loading === "context" ? "..." : "Pin"}
          </button>
          {/* Dismiss */}
          <button
            type="button"
            className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] px-4 text-sm font-medium text-[#8A8A8A] transition-colors hover:text-[#1E2432] disabled:opacity-50"
            onClick={() =>
              handleAction("dismiss", () => onDismiss(item.id))
            }
            disabled={loading !== null}
          >
            <X className="size-[15px]" />
            {loading === "dismiss" ? "..." : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  )
}
