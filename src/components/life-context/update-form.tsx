"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { RichEditor } from "@/components/ui/rich-editor"
import {
  type Severity,
  type ContextUpdate,
  SEVERITY_LIST,
  SEVERITY_LABELS,
  SEVERITY_CLASSES,
} from "@/types/life-context"
import { isEditorEmpty } from "./update-timeline-entry"

export function UpdateForm({
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
