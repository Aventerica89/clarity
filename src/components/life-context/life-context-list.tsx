"use client"

import { useState, useCallback } from "react"
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

  const editingItem = editingId
    ? items.find((it) => it.id === editingId)
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Context Items
          {items.length > 0 && (
            <span className="ml-2 normal-case tabular-nums">
              ({items.length})
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

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-pretty">
          No context yet. Add items to help the coach understand your situation.
        </p>
      )}

      {items.length > 0 && (
        <div className="rounded-lg border bg-card divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-4">
              <Link
                href={`/life-context/${item.id}`}
                className="min-w-0 flex-1 group"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-medium group-hover:text-clarity-amber transition-colors">
                    {item.title}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5",
                      "text-[11px] font-medium ring-1 ring-inset",
                      SEVERITY_CLASSES[item.urgency],
                    )}
                  >
                    {SEVERITY_LABELS[item.urgency]}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-1">
                    {item.description}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground/60">
                  Updated {formatRelativeTime(item.updatedAt)}
                </p>
              </Link>
              <div className="flex flex-shrink-0 gap-1">
                <button
                  type="button"
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-md",
                    "text-muted-foreground transition-colors hover:text-foreground",
                    "before:absolute before:inset-[-4px] before:content-['']",
                  )}
                  onClick={() => setEditingId(item.id)}
                  aria-label={`Edit ${item.title}`}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-md",
                    "text-muted-foreground transition-colors hover:text-destructive",
                    "before:absolute before:inset-[-4px] before:content-['']",
                    "disabled:opacity-50",
                  )}
                  onClick={() => handleArchive(item.id)}
                  disabled={archiving === item.id}
                  aria-label={`Archive ${item.title}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
                <Link
                  href={`/life-context/${item.id}`}
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-md",
                    "text-muted-foreground transition-colors hover:text-foreground",
                  )}
                  aria-label={`View ${item.title}`}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
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
        <DialogContent>
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
        <DialogContent>
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
