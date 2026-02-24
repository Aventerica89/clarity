"use client"

import { useState } from "react"
import { CheckSquare, ArrowUpCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
}

interface EmailCardProps {
  message: GmailMessage
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

export function EmailCard({ message }: EmailCardProps) {
  const [loading, setLoading] = useState<"todoist" | "context" | null>(null)
  const sender = parseSender(message.from)

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

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {sender.name}
          </p>
          <span className="text-xs text-muted-foreground/70 flex-shrink-0">
            {formatDate(message.date)}
          </span>
        </div>
        <p className="font-medium text-sm leading-snug">{message.subject}</p>
        {message.snippet && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {message.snippet}
          </p>
        )}
      </div>

      <div className="flex gap-2">
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
          Add to Todoist
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
      </div>
    </div>
  )
}
