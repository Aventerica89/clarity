"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface FormValues {
  title: string
  description: string
  urgency: "active" | "critical"
}

interface SavedItem {
  id: string
  title: string
  description: string
  urgency: "active" | "critical"
  createdAt: Date
  updatedAt: Date
}

interface Props {
  onSave: (item: SavedItem) => void
  onCancel: () => void
  initialValues?: FormValues
  itemId?: string
}

export function LifeContextForm({ onSave, onCancel, initialValues, itemId }: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? "")
  const [description, setDescription] = useState(initialValues?.description ?? "")
  const [urgency, setUrgency] = useState<"active" | "critical">(
    initialValues?.urgency ?? "active",
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)

    const url = itemId ? `/api/life-context/${itemId}` : "/api/life-context"
    const method = itemId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), urgency }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? "Failed to save.")
        return
      }
      const data = await res.json() as { item: {
        id: string
        title: string
        description: string
        urgency: "active" | "critical"
        createdAt: string
        updatedAt: string
      }}
      onSave({
        ...data.item,
        createdAt: new Date(data.item.createdAt),
        updatedAt: new Date(data.item.updatedAt),
      })
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="ctx-title" className="text-sm">Title</Label>
        <Input
          id="ctx-title"
          placeholder="e.g. Job search in progress"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="ctx-description" className="text-sm">Description</Label>
        <Textarea
          id="ctx-description"
          placeholder="Optional details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Urgency</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={urgency === "active" ? "default" : "outline"}
            onClick={() => setUrgency("active")}
          >
            Active
          </Button>
          <Button
            type="button"
            size="sm"
            variant={urgency === "critical" ? "destructive" : "outline"}
            onClick={() => setUrgency("critical")}
          >
            Critical
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving || !title.trim()}>
          {saving ? "Saving..." : itemId ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  )
}
