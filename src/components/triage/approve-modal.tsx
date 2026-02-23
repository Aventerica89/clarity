"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, X } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { TriageItem } from "./triage-card"

interface Project { id: string; name: string }

interface ApproveModalProps {
  item: TriageItem | null
  onClose: () => void
  onSuccess: (itemId: string, taskId: string) => void
}

export function ApproveModal({ item, onClose, onSuccess }: ApproveModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState("")
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!item) return
    setTitle(item.title)
    setSubtasks([])
    setProjectId("")

    fetch("/api/todoist/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {})

    setLoadingSubtasks(true)
    fetch(`/api/triage/${item.id}/approve`)
      .then((r) => r.json())
      .then((d) => setSubtasks(d.subtasks ?? []))
      .catch(() => {})
      .finally(() => setLoadingSubtasks(false))
  }, [item?.id])

  async function handleSubmit() {
    if (!item || !projectId) return
    setSubmitting(true)

    const res = await fetch(`/api/triage/${item.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        projectId,
        dueDate: dueDate || undefined,
        subtasks,
      }),
    })

    const data = (await res.json()) as { taskId?: string; error?: string }
    setSubmitting(false)

    if (data.taskId) {
      onSuccess(item.id, data.taskId)
    }
  }

  function removeSubtask(i: number) {
    setSubtasks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateSubtask(i: number, value: string) {
    setSubtasks((prev) => prev.map((s, idx) => (idx === i ? value : s)))
  }

  function addSubtask() {
    setSubtasks((prev) => [...prev, ""])
  }

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Todoist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Task title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Due date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Subtasks</Label>
              {loadingSubtasks && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {subtasks.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s}
                  onChange={(e) => updateSubtask(i, e.target.value)}
                  placeholder={`Subtask ${i + 1}`}
                  className="text-sm"
                />
                <Button size="icon" variant="ghost" onClick={() => removeSubtask(i)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addSubtask} className="w-full">
              <Plus className="size-3.5 mr-1.5" />
              Add subtask
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!projectId || submitting}>
            {submitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
