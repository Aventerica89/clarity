"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

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
      <div className="space-y-1.5">
        <label htmlFor="ctx-title" className="text-xs text-muted-foreground">
          Title
        </label>
        <input
          id="ctx-title"
          placeholder="e.g. Job search in progress"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-clarity-amber/40"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ctx-description" className="text-xs text-muted-foreground">
          Description
        </label>
        <textarea
          id="ctx-description"
          placeholder="Optional details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:border-clarity-amber/40"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Urgency</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUrgency("active")}
            className={
              urgency === "active"
                ? "rounded-lg px-3 py-1.5 text-xs font-medium bg-clarity-amber/10 text-clarity-amber ring-1 ring-inset ring-clarity-amber/20"
                : "rounded-lg px-3 py-1.5 text-xs font-medium border text-muted-foreground hover:text-foreground"
            }
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setUrgency("critical")}
            className={
              urgency === "critical"
                ? "rounded-lg px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20"
                : "rounded-lg px-3 py-1.5 text-xs font-medium border text-muted-foreground hover:text-foreground"
            }
          >
            Critical
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-clarity-amber/10 px-3 py-1.5 text-xs font-medium text-clarity-amber transition-colors hover:bg-clarity-amber/20 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {saving ? "Saving..." : itemId ? "Update" : "Add"}
        </button>
      </div>
    </form>
  )
}
