"use client"

import { useState } from "react"
import { Pencil, Trash2, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add context
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No context yet. Add items to help the coach understand your situation.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <Badge
                      className={
                        item.urgency === "critical"
                          ? "bg-red-100 text-red-700 border-red-200 text-xs"
                          : "bg-amber-100 text-amber-700 border-amber-200 text-xs"
                      }
                      variant="outline"
                    >
                      {item.urgency === "critical" ? "Critical" : "Active"}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditingId(item.id)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleArchive(item.id)}
                    disabled={archiving === item.id}
                    aria-label="Archive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {archiveError && (
        <p className="text-sm text-red-500 mt-2">{archiveError}</p>
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
