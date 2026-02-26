"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CalendarDays,
  CheckSquare,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RichEditor } from "@/components/ui/rich-editor"
import { RichContent } from "@/components/ui/rich-content"
import {
  type Severity,
  type ContextItem,
  type ContextUpdate,
  type ContextPin,
  type PinnedItemType,
  SEVERITY_LIST,
  SEVERITY_LABELS,
  SEVERITY_CLASSES,
  formatTimestamp,
  formatRelativeTime,
} from "@/types/life-context"
import { PinSearchDialog } from "@/components/life-context/pin-search-dialog"

const PIN_TYPE_ICONS: Record<PinnedItemType, typeof CheckSquare> = {
  task: CheckSquare,
  email: Mail,
  event: CalendarDays,
  context: Layers,
}

const PIN_TYPE_LABELS: Record<PinnedItemType, string> = {
  task: "Task",
  email: "Email",
  event: "Event",
  context: "Context",
}

const PIN_LINK_DESTINATIONS: Record<PinnedItemType, (id: string) => string> = {
  task: () => "/tasks",
  email: () => "/email",
  event: () => "/calendar",
  context: (id) => `/life-context/${id}`,
}

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
                      setUpdates((prev) =>
                        prev.map((u) => (u.id === updated.id ? updated : u)),
                      )
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

function PinTimelineEntry({
  itemId,
  pin,
  onUnpinned,
}: {
  itemId: string
  pin: ContextPin
  onUnpinned: (pinId: string) => void
}) {
  const [unpinning, setUnpinning] = useState(false)
  const Icon = PIN_TYPE_ICONS[pin.pinnedType]
  const linkTo = PIN_LINK_DESTINATIONS[pin.pinnedType](pin.pinnedId)

  async function handleUnpin() {
    setUnpinning(true)
    try {
      const res = await fetch(`/api/life-context/${itemId}/pins/${pin.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        onUnpinned(pin.id)
      }
    } finally {
      setUnpinning(false)
    }
  }

  return (
    <div className="group relative flex gap-4 pb-6 last:pb-0">
      {/* Violet dot for pins */}
      <div className="relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-background bg-violet-500" />

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-500 ring-1 ring-inset ring-violet-500/20">
            <Icon className="size-3" />
            {PIN_TYPE_LABELS[pin.pinnedType]}
          </span>
          <Link
            href={linkTo}
            className="text-sm font-medium hover:underline truncate"
          >
            {pin.resolved.title}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(pin.createdAt)}
          </span>

          {/* Unpin button — hover reveal */}
          <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-0 max-md:opacity-100">
            <button
              type="button"
              onClick={handleUnpin}
              disabled={unpinning}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              title="Unpin"
            >
              {unpinning ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3" />
              )}
            </button>
          </div>
        </div>

        {pin.resolved.subtitle && (
          <p className="text-xs text-muted-foreground">{pin.resolved.subtitle}</p>
        )}
        {pin.note && (
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{pin.note}&rdquo;
          </p>
        )}
        {pin.direction === "incoming" && (
          <p className="text-[10px] text-muted-foreground/60">
            Linked from another context
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/60">
          {formatTimestamp(pin.createdAt)}
        </p>
      </div>
    </div>
  )
}

function UpdateTimelineEntry({
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
      {/* Timeline dot */}
      <div
        className={cn(
          "relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-background",
          isAi ? "bg-blue-400" : severityDotColor(update.severity),
        )}
      />

      {/* Update content */}
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
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(update.createdAt)}
          </span>
          {isLatest && !isAi && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-clarity-amber">
              Latest
            </span>
          )}
          {/* Edit / Delete — visible on hover (always visible on touch) */}
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
        <p className="text-[11px] text-muted-foreground/60">
          {formatTimestamp(update.createdAt)}
        </p>
      </div>
    </div>
  )
}

function isEditorEmpty(html: string): boolean {
  const stripped = html.replace(/<[^>]*>/g, "").trim()
  return stripped.length === 0
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
    if (isEditorEmpty(content)) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/life-context/${itemId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, severity }),
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
      <RichEditor
        onChange={setContent}
        placeholder="What's changed? How is this situation progressing?"
        minHeight="200px"
        autofocus
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
          disabled={saving || isEditorEmpty(content)}
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
