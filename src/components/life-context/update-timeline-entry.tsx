"use client"

import { useState } from "react"
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { RichEditor } from "@/components/ui/rich-editor"
import { RichContent } from "@/components/ui/rich-content"
import {
  type Severity,
  type ContextUpdate,
  SEVERITY_LIST,
  SEVERITY_LABELS,
  SEVERITY_CLASSES,
  formatTimestamp,
  formatRelativeTime,
} from "@/types/life-context"
import { SeverityBadge, severityDotColor } from "./severity-badge"

export function isEditorEmpty(html: string): boolean {
  const stripped = html.replace(/<[^>]*>/g, "").trim()
  return stripped.length === 0
}

export function UpdateTimelineEntry({
  itemId,
  update,
  isLatest,
  onUpdated,
  onDeleted,
}: {
  itemId: string
  update: ContextUpdate
  isLatest: boolean
  onUpdated: (u: ContextUpdate) => void
  onDeleted: (id: string) => void
}) {
  const isAi = update.source === "ai"
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(update.content)
  const [editSeverity, setEditSeverity] = useState<Severity>(update.severity)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [approving, setApproving] = useState(false)

  const isPendingApproval = isAi && update.approvalStatus === "pending"

  async function handleApproval(action: "approve" | "dismiss") {
    setApproving(true)
    try {
      const res = await fetch(
        `/api/life-context/${itemId}/updates/${update.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      )
      if (!res.ok) return
      const data = (await res.json()) as { update: ContextUpdate }
      onUpdated(data.update)
    } finally {
      setApproving(false)
    }
  }

  async function handleSave() {
    if (isEditorEmpty(editContent)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/life-context/${itemId}/updates/${update.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: editContent,
            severity: editSeverity,
          }),
        },
      )
      if (!res.ok) {
        setError("Failed to save.")
        return
      }
      const data = (await res.json()) as { update: ContextUpdate }
      onUpdated(data.update)
      setEditing(false)
    } catch {
      setError("Network error.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/life-context/${itemId}/updates/${update.id}`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        setConfirmDel(false)
        setDeleting(false)
        return
      }
      onDeleted(update.id)
    } catch {
      setConfirmDel(false)
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="relative flex gap-4 pb-6 last:pb-0">
        <div
          className={cn(
            "relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-background",
            isAi ? "bg-blue-400" : severityDotColor(update.severity),
          )}
        />
        <div className="flex-1 min-w-0 space-y-3 rounded-lg border bg-card p-3">
          <RichEditor
            content={editContent}
            onChange={setEditContent}
            placeholder="Update content..."
            minHeight="120px"
            autofocus
          />
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Severity</label>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_LIST.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEditSeverity(s)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    editSeverity === s
                      ? cn("ring-1 ring-inset", SEVERITY_CLASSES[s])
                      : "border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {SEVERITY_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || isEditorEmpty(editContent)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5",
                "text-xs font-medium",
                "bg-clarity-amber text-clarity-amber-foreground hover:bg-clarity-amber/90",
                "disabled:opacity-50",
              )}
            >
              {saving && <Loader2 className="size-3 animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex gap-4 pb-6 last:pb-0">
      <div
        className={cn(
          "relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-background",
          isAi ? "bg-blue-400" : severityDotColor(update.severity),
        )}
      />

      <div
        className={cn(
          "flex-1 min-w-0 space-y-1",
          isAi && "rounded-md bg-blue-500/5 px-3 py-2 -ml-1",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={update.severity} size="sm" />
          {isAi && (
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500 ring-1 ring-inset ring-blue-500/20">
              AI note
            </span>
          )}
          {isAi && update.model && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {update.model}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(update.createdAt)}
          </span>
          {isLatest && !isAi && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-clarity-amber">
              Latest
            </span>
          )}
          {!isAi && (
            <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-0 max-md:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setEditContent(update.content)
                  setEditSeverity(update.severity)
                  setError(null)
                  setEditing(true)
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Edit update"
              >
                <Pencil className="size-3" />
              </button>
              {confirmDel ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {deleting ? "..." : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(false)}
                    disabled={deleting}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDel(true)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete update"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          )}
        </div>
        <RichContent
          content={update.content}
          className={cn(isAi && "italic text-muted-foreground")}
        />
        {isPendingApproval && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2">
            <span className="text-[11px] text-blue-500 flex-1">
              {update.proposedUrgency ? (
                <>
                  Proposed status change to{" "}
                  <span className={cn("font-medium", SEVERITY_CLASSES[update.proposedUrgency])}>
                    {SEVERITY_LABELS[update.proposedUrgency]}
                  </span>
                </>
              ) : (
                "AI note — keep or dismiss"
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleApproval("approve")}
                disabled={approving}
                className="flex items-center gap-1 rounded-md bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-600 hover:bg-green-500/20 disabled:opacity-50 dark:text-green-400"
              >
                {approving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Apply
              </button>
              <button
                type="button"
                onClick={() => handleApproval("dismiss")}
                disabled={approving}
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="size-3" />
                Dismiss
              </button>
            </div>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground/60">
          {formatTimestamp(update.createdAt)}
        </p>
      </div>
    </div>
  )
}
