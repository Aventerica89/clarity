"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type Severity,
  SEVERITY_LIST,
  SEVERITY_LABELS,
  SEVERITY_CLASSES,
} from "@/types/life-context"

type FormValues = {
  title: string
  description: string
  urgency: Severity
}

type SavedItem = {
  id: string
  title: string
  description: string
  urgency: Severity
  createdAt: Date
  updatedAt: Date
}

export function LifeContextForm({
  onSave,
  onCancel,
  initialValues,
  itemId,
}: {
  onSave: (item: SavedItem) => void
  onCancel: () => void
  initialValues?: FormValues
  itemId?: string
}) {
  const [title, setTitle] = useState(initialValues?.title ?? "")
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  )
  const [urgency, setUrgency] = useState<Severity>(
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
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          urgency,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        setError(data.error ?? "Failed to save.")
        return
      }
      const data = (await res.json()) as {
        item: {
          id: string
          title: string
          description: string
          urgency: Severity
          createdAt: string
          updatedAt: string
        }
      }
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
      <div className="space-y-2">
        <label htmlFor="ctx-title" className="text-xs text-muted-foreground">
          Title
        </label>
        <input
          id="ctx-title"
          placeholder="e.g. Job search in progress"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={cn(
            "w-full rounded-sm border bg-transparent px-3 py-2 text-sm",
            "focus-visible:border-clarity-amber/40 focus-visible:outline-none",
          )}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="ctx-description"
          className="text-xs text-muted-foreground"
        >
          Description
        </label>
        <textarea
          id="ctx-description"
          placeholder="Optional details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={cn(
            "w-full resize-none rounded-sm border bg-transparent px-3 py-2 text-sm",
            "focus-visible:border-clarity-amber/40 focus-visible:outline-none",
          )}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Urgency</label>
        <div className="flex flex-wrap gap-2">
          {SEVERITY_LIST.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setUrgency(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                urgency === s
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
        <p className="text-xs text-destructive" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={cn(
            "min-h-[44px] rounded-md border px-4 py-2.5 text-xs font-medium",
            "text-muted-foreground transition-colors",
            "hover:text-foreground disabled:opacity-50",
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2.5",
            "text-xs font-medium transition-colors",
            "bg-clarity-amber text-clarity-amber-foreground hover:bg-clarity-amber/90",
            "disabled:opacity-50",
          )}
        >
          {saving && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {saving ? "Saving..." : itemId ? "Update" : "Add"}
        </button>
      </div>
    </form>
  )
}
