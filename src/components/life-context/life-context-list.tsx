"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { ChevronRight, Pencil, Trash2, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { LifeContextForm } from "./life-context-form"
import {
  type Severity,
  SEVERITY_LIST,
  SEVERITY_LABELS,
  SEVERITY_CLASSES,
  formatRelativeTime,
} from "@/types/life-context"

type ContextItem = {
  id: string
  title: string
  description: string
  urgency: Severity
  createdAt: Date
  updatedAt: Date
}

export function LifeContextList({
  initialItems,
}: {
  initialItems: ContextItem[]
}) {
  const [items, setItems] = useState<ContextItem[]>(initialItems)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | Severity>("all")

  const handleCreated = useCallback((item: ContextItem) => {
    setItems((prev) => [item, ...prev])
    setShowCreate(false)
  }, [])

  const handleUpdated = useCallback((updated: ContextItem) => {
    setItems((prev) =>
      prev.map((it) => (it.id === updated.id ? updated : it)),
    )
    setEditingId(null)
  }, [])

  const handleArchive = useCallback(async (id: string) => {
    setArchiving(id)
    setArchiveError(null)
    try {
      const res = await fetch(`/api/life-context/${id}`, { method: "DELETE" })
      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== id))
      } else {
        setArchiveError("Failed to archive. Please try again.")
      }
    } catch {
      setArchiveError("Failed to archive. Please try again.")
    } finally {
      setArchiving(null)
    }
  }, [])

  const presentLevels = useMemo(
    () => SEVERITY_LIST.filter((s) => items.some((it) => it.urgency === s)),
    [items],
  )

  const displayItems = useMemo(
    () => (filter === "all" ? items : items.filter((it) => it.urgency === filter)),
    [items, filter],
  )

  const editingItem = editingId ? items.find((it) => it.id === editingId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Context Items
          {items.length > 0 && (
            <span className="ml-2 normal-case tabular-nums">
              ({displayItems.length}{filter !== "all" ? ` / ${items.length}` : ""})
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-lg border",
            "px-4 py-2.5 text-xs font-medium text-muted-foreground",
            "transition-colors hover:border-foreground/20 hover:text-foreground",
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add context
        </button>
      </div>

      {presentLevels.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
              filter === "all"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {presentLevels.map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                filter === level
                  ? cn("ring-1 ring-inset", SEVERITY_CLASSES[level])
                  : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {SEVERITY_LABELS[level]}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-pretty">
          No context yet. Add items to help the coach understand your situation.
        </p>
      )}

      {displayItems.length === 0 && items.length > 0 && (
        <p className="text-sm text-muted-foreground">
          No {SEVERITY_LABELS[filter as Severity]} items.
        </p>
      )}

      {displayItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border bg-card p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/life-context/${item.id}`}
                  className="min-w-0 flex-1 group"
                >
                  <p className="text-[13px] font-medium group-hover:text-clarity-amber transition-colors leading-snug">
                    {item.title}
                  </p>
                </Link>
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center rounded-full px-2 py-0.5",
                    "text-[11px] font-medium ring-1 ring-inset",
                    SEVERITY_CLASSES[item.urgency],
                  )}
                >
                  {SEVERITY_LABELS[item.urgency]}
                </span>
              </div>

              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto pt-1">
                <p className="text-[11px] text-muted-foreground/60">
                  Updated {formatRelativeTime(item.updatedAt)}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-md",
                      "text-muted-foreground transition-colors hover:text-foreground",
                    )}
                    onClick={() => setEditingId(item.id)}
                    aria-label={`Edit ${item.title}`}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-md",
                      "text-muted-foreground transition-colors hover:text-destructive",
                      "disabled:opacity-50",
                    )}
                    onClick={() => handleArchive(item.id)}
                    disabled={archiving === item.id}
                    aria-label={`Archive ${item.title}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                  <Link
                    href={`/life-context/${item.id}`}
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-md",
                      "text-muted-foreground transition-colors hover:text-foreground",
                    )}
                    aria-label={`View ${item.title}`}
                  >
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {archiveError && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {archiveError}
        </p>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add context item</DialogTitle>
          </DialogHeader>
          {showCreate && (
            <LifeContextForm
              onSave={handleCreated}
              onCancel={() => setShowCreate(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit context item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <LifeContextForm
              onSave={handleUpdated}
              onCancel={() => setEditingId(null)}
              initialValues={{
                title: editingItem.title,
                description: editingItem.description,
                urgency: editingItem.urgency,
              }}
              itemId={editingItem.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
