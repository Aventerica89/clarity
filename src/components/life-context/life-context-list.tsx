"use client"

import { useState } from "react"
import { Pencil, Trash2, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LifeContextForm } from "./life-context-form"

interface ContextItem {
  id: string
  title: string
  description: string
  urgency: "active" | "critical"
  createdAt: Date
  updatedAt: Date
}

interface Props {
  initialItems: ContextItem[]
}

export function LifeContextList({ initialItems }: Props) {
  const [items, setItems] = useState<ContextItem[]>(initialItems)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  function handleCreated(item: ContextItem) {
    setItems((prev) => [item, ...prev])
    setShowCreate(false)
  }

  function handleUpdated(updated: ContextItem) {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)))
    setEditingId(null)
  }

  async function handleArchive(id: string) {
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
  }

  const editingItem = editingId ? items.find((it) => it.id === editingId) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Context Items
          {items.length > 0 && (
            <span className="ml-1.5 normal-case">({items.length})</span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add context
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No context yet. Add items to help the coach understand your situation.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span
                    className={
                      item.urgency === "critical"
                        ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20"
                        : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-clarity-amber/10 text-clarity-amber ring-1 ring-inset ring-clarity-amber/20"
                    }
                  >
                    {item.urgency === "critical" ? "Critical" : "Active"}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setEditingId(item.id)}
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => handleArchive(item.id)}
                  disabled={archiving === item.id}
                  aria-label="Archive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {archiveError && (
        <p className="text-sm text-destructive mt-2">{archiveError}</p>
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

      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) setEditingId(null) }}>
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
