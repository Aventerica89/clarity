"use client"

import { useMemo, useState } from "react"
import {
  CheckSquare,
  ArrowUpCircle,
  Archive,
  Star,
  Loader2,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { sanitizeEmailHtml } from "@/lib/sanitize-html"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PinToContextDialog } from "@/components/life-context/pin-to-context-dialog"

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
  isFavorited?: boolean
}

interface EmailCardProps {
  message: GmailMessage
  onArchived?: (gmailId: string) => void
  onFavoriteToggled?: (gmailId: string, favorited: boolean) => void
  variant?: "compact" | "comfortable"
}

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2] }
  return { name: from, email: from }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    }
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) {
      return d.toLocaleDateString("en-US", { weekday: "short" })
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

export function EmailCard({ message, onArchived, onFavoriteToggled, variant = "comfortable" }: EmailCardProps) {
  const isCompact = variant === "compact"
  const [loading, setLoading] = useState<string | null>(null)
  const [favorited, setFavorited] = useState(message.isFavorited ?? false)
  const [pinOpen, setPinOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [bodyHtml, setBodyHtml] = useState<string | null>(null)
  const [bodyPlain, setBodyPlain] = useState<string | null>(null)
  const [bodyLoading, setBodyLoading] = useState(false)
  const [bodyError, setBodyError] = useState<string | null>(null)
  const [bodyFetched, setBodyFetched] = useState(false)
  const sender = parseSender(message.from)

  const sanitizedHtml = useMemo(
    () => (bodyHtml ? sanitizeEmailHtml(bodyHtml) : ""),
    [bodyHtml],
  )

  async function handleExpand() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (bodyFetched) return
    setBodyLoading(true)
    setBodyError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const res = await fetch(`/api/emails/${message.id}/body`, { signal: controller.signal })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setBodyError(data.error ?? "Failed to load email")
        return
      }
      const data = (await res.json()) as { html: string | null; plain: string | null }
      setBodyHtml(data.html)
      setBodyPlain(data.plain)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setBodyError("Request timed out")
      } else {
        setBodyError("Failed to load email")
      }
    } finally {
      clearTimeout(timeout)
      setBodyLoading(false)
      setBodyFetched(true)
    }
  }

  async function handleAction(action: "add_to_todoist" | "push_to_context") {
    const key = action === "add_to_todoist" ? "todoist" : "context"
    setLoading(key)
    try {
      const res = await fetch("/api/emails/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          title: message.subject,
          snippet: message.snippet,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Action failed")
        return
      }

      toast.success(
        action === "add_to_todoist" ? "Added to Todoist" : "Added to Life Context",
      )
    } catch {
      toast.error("Action failed")
    } finally {
      setLoading(null)
    }
  }

  async function handleArchive() {
    setLoading("archive")
    try {
      const res = await fetch("/api/emails/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmailId: message.id }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Archive failed")
        return
      }

      toast.success("Archived")
      onArchived?.(message.id)
    } catch {
      toast.error("Archive failed")
    } finally {
      setLoading(null)
    }
  }

  async function handleFavorite() {
    const next = !favorited
    setFavorited(next)
    try {
      const res = await fetch("/api/emails/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmailId: message.id, favorited: next }),
      })

      if (!res.ok) {
        setFavorited(!next)
        toast.error("Failed to update favorite")
        return
      }

      onFavoriteToggled?.(message.id, next)
    } catch {
      setFavorited(!next)
      toast.error("Failed to update favorite")
    }
  }

  return (
    <div className={`rounded-lg border bg-card space-y-3 ${isCompact ? "p-2.5" : "p-4"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleFavorite}
              className="flex-shrink-0 text-muted-foreground hover:text-amber-500 transition-colors"
              aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={`size-3.5 ${favorited ? "fill-amber-500 text-amber-500" : ""}`}
              />
            </button>
            <p className="text-xs font-medium text-muted-foreground truncate">
              {sender.name}
            </p>
          </div>
          <span className="text-xs text-muted-foreground/70 flex-shrink-0">
            {formatDate(message.date)}
          </span>
        </div>
        <p className="font-medium text-sm leading-snug">{message.subject}</p>
        {message.snippet && (
          <p className={`text-xs text-muted-foreground mt-1 ${isCompact ? "line-clamp-1" : "line-clamp-2"}`}>
            {message.snippet}
          </p>
        )}

        <button
          onClick={handleExpand}
          className={`flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 ${isCompact ? "hidden" : ""}`}
        >
          {expanded
            ? <ChevronUp className="size-3" />
            : <ChevronDown className="size-3" />
          }
          {expanded ? "Collapse" : "Read more"}
        </button>
      </div>

      {expanded && (
        <div className="border-t pt-3">
          {bodyLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </div>
          )}
          {bodyError && (
            <p className="text-xs text-destructive">{bodyError}</p>
          )}
          {!bodyLoading && !bodyError && bodyHtml && (
            <iframe
              srcDoc={sanitizedHtml}
              sandbox="allow-same-origin"
              className="w-full h-96 max-h-[500px] border-0"
              title="Email body"
            />
          )}
          {!bodyLoading && !bodyError && !bodyHtml && bodyPlain && (
            <pre className="text-xs whitespace-pre-wrap text-foreground font-sans">
              {bodyPlain}
            </pre>
          )}
          {!bodyLoading && !bodyError && bodyHtml === null && bodyPlain === null && (
            <p className="text-xs text-muted-foreground">No body content available.</p>
          )}
        </div>
      )}

      <div className={`flex gap-2 ${isCompact ? "hidden" : ""}`}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("add_to_todoist")}
          disabled={loading !== null}
        >
          {loading === "todoist"
            ? <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            : <CheckSquare className="size-3.5 mr-1.5" />
          }
          Todoist
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("push_to_context")}
          disabled={loading !== null}
        >
          {loading === "context"
            ? <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            : <ArrowUpCircle className="size-3.5 mr-1.5" />
          }
          Context
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleArchive}
          disabled={loading !== null}
        >
          {loading === "archive"
            ? <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            : <Archive className="size-3.5 mr-1.5" />
          }
          Archive
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-muted-foreground hover:text-violet-500"
          onClick={() => setPinOpen(true)}
          disabled={loading !== null}
        >
          <MapPin className="size-3.5 mr-1.5" />
          Pin
        </Button>
      </div>

      <PinToContextDialog
        sourceType="email"
        sourceId={message.id}
        sourceTitle={message.subject}
        open={pinOpen}
        onOpenChange={setPinOpen}
      />
    </div>
  )
}
