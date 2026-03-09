"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

type FieldType = "email" | "todoist" | "tasks"

interface FieldDef {
  key: string
  label: string
  notes: string
  important?: boolean
}

const FIELD_DEFS: Record<FieldType, FieldDef[]> = {
  email: [
    { key: "source", label: "Source", notes: "Provider/source channel", important: true },
    { key: "subject", label: "Subject", notes: "Primary title line", important: true },
    { key: "fromRaw", label: "From", notes: "Sender raw value", important: true },
    { key: "snippet", label: "Snippet", notes: "Body preview", important: true },
    { key: "date", label: "Date", notes: "Message date", important: true },
    { key: "threadId", label: "Thread ID", notes: "Groups related emails" },
    { key: "gmailId", label: "Gmail ID", notes: "Stable external id" },
    { key: "isStarred", label: "Starred", notes: "Native Gmail star state" },
    { key: "isFavorited", label: "Favorited", notes: "App-level favorite flag" },
    { key: "isArchived", label: "Archived", notes: "Local archive state" },
    { key: "createdAt", label: "Created At", notes: "Row creation timestamp" },
    { key: "updatedAt", label: "Updated At", notes: "Last sync update timestamp" },
  ],
  todoist: [
    { key: "source", label: "Source", notes: "Origin source key", important: true },
    { key: "title", label: "Title", notes: "Task content", important: true },
    { key: "description", label: "Description", notes: "Task description body" },
    { key: "priorityManual", label: "Priority", notes: "Mapped Todoist priority", important: true },
    { key: "dueDate", label: "Due Date", notes: "Task due day", important: true },
    { key: "dueTime", label: "Due Time", notes: "Task due time" },
    { key: "labels", label: "Labels", notes: "Label list JSON" },
    { key: "metadata.projectName", label: "Project Name", notes: "From metadata" },
    { key: "metadata.sectionName", label: "Section Name", notes: "From metadata" },
    { key: "triaged", label: "Triaged", notes: "Passed through triage queue" },
    { key: "isCompleted", label: "Completed", notes: "Completion state" },
    { key: "isHidden", label: "Hidden", notes: "User-hidden state" },
    { key: "createdAt", label: "Created At", notes: "Row creation timestamp" },
    { key: "updatedAt", label: "Updated At", notes: "Last sync update timestamp" },
  ],
  tasks: [
    { key: "title", label: "Title", notes: "Primary task title", important: true },
    { key: "source", label: "Source", notes: "todoist/manual/gmail/etc", important: true },
    { key: "priorityManual", label: "Priority", notes: "Display priority pill", important: true },
    { key: "dueDate", label: "Due Date", notes: "Date sorting and urgency", important: true },
    { key: "description", label: "Description", notes: "Expanded details" },
    { key: "labels", label: "Labels", notes: "Label chips for scanning" },
    { key: "priorityScore", label: "AI Score", notes: "Machine urgency score" },
    { key: "dueTime", label: "Due Time", notes: "Time-specific tasks" },
    { key: "triaged", label: "Triaged", notes: "Pending/processed via triage" },
    { key: "isCompleted", label: "Completed", notes: "Completion state" },
    { key: "isHidden", label: "Hidden", notes: "User-hidden state" },
    { key: "metadata", label: "Metadata", notes: "Source-specific JSON fields" },
    { key: "createdAt", label: "Created At", notes: "Row creation timestamp" },
    { key: "updatedAt", label: "Updated At", notes: "Last update timestamp" },
  ],
}

type SelectionState = Record<FieldType, Record<string, boolean>>
const STORAGE_KEY = "dev-field-catalog-selection-v1"

function buildDefaultSelection(): SelectionState {
  return {
    email: Object.fromEntries(FIELD_DEFS.email.map((f) => [f.key, !!f.important])),
    todoist: Object.fromEntries(FIELD_DEFS.todoist.map((f) => [f.key, !!f.important])),
    tasks: Object.fromEntries(FIELD_DEFS.tasks.map((f) => [f.key, !!f.important])),
  }
}

export function FieldCatalog() {
  const [selected, setSelected] = useState<SelectionState>(() => {
    if (typeof window === "undefined") return buildDefaultSelection()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefaultSelection()
    try {
      return JSON.parse(raw) as SelectionState
    } catch {
      return buildDefaultSelection()
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected))
  }, [selected])

  const selectedCounts = useMemo(
    () => ({
      email: Object.values(selected.email).filter(Boolean).length,
      todoist: Object.values(selected.todoist).filter(Boolean).length,
      tasks: Object.values(selected.tasks).filter(Boolean).length,
    }),
    [selected],
  )

  function toggle(type: FieldType, key: string, next: boolean) {
    setSelected((prev) => ({
      ...prev,
      [type]: { ...prev[type], [key]: next },
    }))
  }

  function selectAll(type: FieldType) {
    setSelected((prev) => ({
      ...prev,
      [type]: Object.fromEntries(FIELD_DEFS[type].map((f) => [f.key, true])),
    }))
  }

  function selectImportant(type: FieldType) {
    setSelected((prev) => ({
      ...prev,
      [type]: Object.fromEntries(FIELD_DEFS[type].map((f) => [f.key, !!f.important])),
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">Field Catalog</h1>
          <Badge variant="outline" className="text-xs font-mono">internal</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick which fields should be surfaced in cards/tables.
        </p>
      </div>

      {(["email", "todoist", "tasks"] as const).map((type) => (
        <Card key={type} className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold capitalize">{type}</h2>
              <Badge variant="secondary" className="text-[10px]">
                {selectedCounts[type]}/{FIELD_DEFS[type].length} selected
              </Badge>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => selectImportant(type)}>
                Important
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => selectAll(type)}>
                All
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {FIELD_DEFS[type].map((field) => (
              <label key={field.key} className="flex items-start gap-2.5 rounded-md border p-2">
                <Checkbox
                  checked={selected[type][field.key] ?? false}
                  onCheckedChange={(v) => toggle(type, field.key, !!v)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{field.label}</span>
                    <code className="text-[10px] text-muted-foreground">{field.key}</code>
                    {field.important && (
                      <Badge variant="outline" className="text-[10px]">core</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{field.notes}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
