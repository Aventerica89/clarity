"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type Severity,
  type ContextItem,
  type ContextUpdate,
  SEVERITY_LIST,
  SEVERITY_LABELS,
  SEVERITY_CLASSES,
  formatTimestamp,
  formatRelativeTime,
} from "@/types/life-context"

interface ContextDetailClientProps {
  item: ContextItem
  initialUpdates: ContextUpdate[]
}

export function ContextDetailClient({
  item,
  initialUpdates,
}: ContextDetailClientProps) {
  const [updates, setUpdates] = useState<ContextUpdate[]>(initialUpdates)
  const [currentSeverity, setCurrentSeverity] = useState<Severity>(item.urgency)
  const [showForm, setShowForm] = useState(false)

  function handleUpdateAdded(update: ContextUpdate) {
    setUpdates((prev) => [update, ...prev])
    setCurrentSeverity(update.severity)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Item header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{item.title}</h1>
          <SeverityBadge severity={currentSeverity} />
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Created {formatTimestamp(item.createdAt)}
        </p>
      </div>

      {/* Add update button / form */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Updates
            {updates.length > 0 && (
              <span className="ml-2 normal-case tabular-nums">
                ({updates.length})
              </span>
            )}
          </h2>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className={cn(
                "flex min-h-[44px] items-center gap-2 rounded-lg border",
                "px-4 py-2.5 text-xs font-medium text-muted-foreground",
                "transition-colors hover:border-foreground/20 hover:text-foreground",
              )}
            >
              <Plus className="size-4" />
              Add update
            </button>
          )}
        </div>

        {showForm && (
          <UpdateForm
            itemId={item.id}
            currentSeverity={currentSeverity}
            onSave={handleUpdateAdded}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>

      {/* Timeline */}
      {updates.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">
          No updates yet. Add one to track progress.
        </p>
      )}

      {updates.length > 0 && (
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

          {updates.map((update, i) => (
            <div key={update.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Timeline dot */}
              <div
                className={cn(
                  "relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-background",
                  severityDotColor(update.severity),
                )}
              />

              {/* Update content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={update.severity} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(update.createdAt)}
                  </span>
                  {i === 0 && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-clarity-amber">
                      Latest
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{update.content}</p>
                <p className="text-[11px] text-muted-foreground/60">
                  {formatTimestamp(update.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SeverityBadge({
  severity,
  size = "md",
}: {
  severity: Severity
  size?: "sm" | "md"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full ring-1 ring-inset font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        SEVERITY_CLASSES[severity],
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  )
}

function severityDotColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    monitoring: "bg-muted-foreground",
    active: "bg-clarity-amber",
    escalated: "bg-orange-500",
    critical: "bg-destructive",
    resolved: "bg-green-500",
  }
  return map[severity]
}

function UpdateForm({
  itemId,
  currentSeverity,
  onSave,
  onCancel,
}: {
  itemId: string
  currentSeverity: Severity
  onSave: (update: ContextUpdate) => void
  onCancel: () => void
}) {
  const [content, setContent] = useState("")
  const [severity, setSeverity] = useState<Severity>(currentSeverity)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/life-context/${itemId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), severity }),
      })
      if (!res.ok) {
        setError("Failed to save update.")
        return
      }
      const data = (await res.json()) as { update: ContextUpdate }
      onSave(data.update)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's changed? How is this situation progressing?"
        rows={3}
        className={cn(
          "w-full resize-none rounded-sm border bg-transparent px-3 py-2 text-sm",
          "focus-visible:border-clarity-amber/40 focus-visible:outline-none",
        )}
      />

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Severity</label>
        <div className="flex flex-wrap gap-2">
          {SEVERITY_LIST.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                severity === s
                  ? cn("ring-1 ring-inset", SEVERITY_CLASSES[s])
                  : "border text-muted-foreground hover:text-foreground",
              )}
            >
              {SEVERITY_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5",
            "text-xs font-medium",
            "bg-clarity-amber text-clarity-amber-foreground hover:bg-clarity-amber/90",
            "disabled:opacity-50",
          )}
        >
          {saving && <Loader2 className="size-3 animate-spin" />}
          {saving ? "Saving..." : "Post Update"}
        </button>
      </div>
    </form>
  )
}
