"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { RichEditor } from "@/components/ui/rich-editor"
import { RichContent } from "@/components/ui/rich-content"
import {
  type Severity,
  type ContextItem,
  type ContextUpdate,
  type ContextPin,
  SEVERITY_LIST,
  SEVERITY_LABELS,
  SEVERITY_CLASSES,
  formatTimestamp,
} from "@/types/life-context"
import { SeverityBadge } from "./severity-badge"
import { PinTimelineEntry } from "./pin-timeline-entry"
import { UpdateTimelineEntry } from "./update-timeline-entry"
import { UpdateForm } from "./update-form"
import { PinSearchDialog } from "./pin-search-dialog"

interface ContextDetailClientProps {
  item: ContextItem
  initialUpdates: ContextUpdate[]
  initialPins?: ContextPin[]
}

// Unified timeline entry: update or pin
type TimelineEntry =
  | { kind: "update"; data: ContextUpdate }
  | { kind: "pin"; data: ContextPin }

export function ContextDetailClient({
  item,
  initialUpdates,
  initialPins = [],
}: ContextDetailClientProps) {
  const router = useRouter()
  const [updates, setUpdates] = useState<ContextUpdate[]>(initialUpdates)
  const [pins, setPins] = useState<ContextPin[]>(initialPins)
  const [currentSeverity, setCurrentSeverity] = useState<Severity>(item.urgency)
  const [showForm, setShowForm] = useState(false)
  const [showPinSearch, setShowPinSearch] = useState(false)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editDescription, setEditDescription] = useState(item.description)
  const [editSeverity, setEditSeverity] = useState<Severity>(item.urgency)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [displayTitle, setDisplayTitle] = useState(item.title)
  const [displayDescription, setDisplayDescription] = useState(item.description)

  function handleUpdateAdded(update: ContextUpdate) {
    setUpdates((prev) => [update, ...prev])
    setCurrentSeverity(update.severity)
    setShowForm(false)
  }

  async function handleEditSave() {
    if (!editTitle.trim()) return
    setEditSaving(true)
    setEditError(null)

    try {
      const res = await fetch(`/api/life-context/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          urgency: editSeverity,
        }),
      })
      if (!res.ok) {
        setEditError("Failed to save changes.")
        return
      }
      setDisplayTitle(editTitle.trim())
      setDisplayDescription(editDescription.trim())
      setCurrentSeverity(editSeverity)
      setEditing(false)
    } catch {
      setEditError("Network error. Please try again.")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/life-context/${item.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        setConfirmDelete(false)
        setDeleting(false)
        return
      }
      router.push("/life-context")
    } catch {
      setConfirmDelete(false)
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Item header */}
      {editing ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={cn(
                "w-full rounded-sm border bg-transparent px-3 py-2 text-sm",
                "focus-visible:border-clarity-amber/40 focus-visible:outline-none",
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              Description
            </label>
            <RichEditor
              content={editDescription}
              onChange={setEditDescription}
              placeholder="Describe this context item..."
              minHeight="120px"
              autofocus={false}
            />
          </div>
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
          {editError && (
            <p className="text-xs text-destructive">{editError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={editSaving}
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEditSave}
              disabled={editSaving || !editTitle.trim()}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5",
                "text-xs font-medium",
                "bg-clarity-amber text-clarity-amber-foreground hover:bg-clarity-amber/90",
                "disabled:opacity-50",
              )}
            >
              {editSaving && <Loader2 className="size-3 animate-spin" />}
              {editSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{displayTitle}</h1>
            <SeverityBadge severity={currentSeverity} />
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPinSearch(true)}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-violet-500"
                title="Pin item"
              >
                <MapPin className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditTitle(displayTitle)
                  setEditDescription(displayDescription)
                  setEditSeverity(currentSeverity)
                  setEditError(null)
                  setEditing(true)
                }}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Edit item"
              >
                <Pencil className="size-4" />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-destructive">Delete?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {deleting ? "..." : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Delete item"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
          {displayDescription && (
            <RichContent
              content={displayDescription}
              className="text-muted-foreground"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Created {formatTimestamp(item.createdAt)}
          </p>
        </div>
      )}

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

      {/* Timeline — merged updates + pins, sorted by createdAt DESC */}
      {(() => {
        const timeline: TimelineEntry[] = [
          ...updates.map((u) => ({ kind: "update" as const, data: u })),
          ...pins.map((p) => ({ kind: "pin" as const, data: p })),
        ].sort((a, b) => {
          const aDate = new Date(a.data.createdAt).getTime()
          const bDate = new Date(b.data.createdAt).getTime()
          return bDate - aDate
        })

        if (timeline.length === 0 && !showForm) {
          return (
            <p className="text-sm text-muted-foreground">
              No updates yet. Add one to track progress.
            </p>
          )
        }

        const firstUpdateIdx = timeline.findIndex((e) => e.kind === "update")

        return (
          <div className="relative space-y-0">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            {timeline.map((entry, i) => {
              if (entry.kind === "update") {
                return (
                  <UpdateTimelineEntry
                    key={entry.data.id}
                    itemId={item.id}
                    update={entry.data}
                    isLatest={i === firstUpdateIdx}
                    onUpdated={(updated) => {
                      if (updated.approvalStatus === "dismissed" && !updated.proposedUrgency) {
                        // Plain AI note dismissed — remove from timeline
                        setUpdates((prev) => prev.filter((u) => u.id !== updated.id))
                      } else {
                        setUpdates((prev) =>
                          prev.map((u) => (u.id === updated.id ? updated : u)),
                        )
                        if (updated.approvalStatus === "approved" && updated.proposedUrgency) {
                          setCurrentSeverity(updated.proposedUrgency)
                        }
                      }
                    }}
                    onDeleted={(id) => {
                      setUpdates((prev) => prev.filter((u) => u.id !== id))
                    }}
                  />
                )
              }
              return (
                <PinTimelineEntry
                  key={entry.data.id}
                  itemId={item.id}
                  pin={entry.data}
                  onUnpinned={(pinId) => {
                    setPins((prev) => prev.filter((p) => p.id !== pinId))
                  }}
                />
              )
            })}
          </div>
        )
      })()}

      <PinSearchDialog
        contextItemId={item.id}
        open={showPinSearch}
        onOpenChange={setShowPinSearch}
        onPinCreated={(pin) => setPins((prev) => [pin, ...prev])}
      />
    </div>
  )
}
