"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Project {
  id: string
  name: string
}

interface CreateTaskModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateTaskModal({
  open,
  onClose,
  onSuccess,
}: CreateTaskModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState("")
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState("1")
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle("")
    setDueDate("")
    setProjectId("")
    setPriority("1")
    setSubtasks([])

    fetch("/api/todoist/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
  }, [open])

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        projectId: projectId && projectId !== "none" ? projectId : undefined,
        dueDate: dueDate || undefined,
        priority: parseInt(priority, 10),
        subtasks: subtasks.filter((s) => s.trim()),
      }),
    })

    setSubmitting(false)
    onSuccess()
    onClose()
  }

  function removeSubtask(i: number) {
    setSubtasks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateSubtask(i: number, value: string) {
    setSubtasks((prev) => prev.map((s, idx) => (idx === i ? value : s)))
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Normal</SelectItem>
                  <SelectItem value="3">Medium</SelectItem>
                  <SelectItem value="4">High</SelectItem>
                  <SelectItem value="5">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="space-y-1.5">
              <Label>Todoist project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Manual (no project)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual (no project)</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Subtasks</Label>
            {subtasks.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s}
                  onChange={(e) => updateSubtask(i, e.target.value)}
                  placeholder={`Subtask ${i + 1}`}
                  className="text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeSubtask(i)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSubtasks((p) => [...p, ""])}
              className="w-full"
            >
              <Plus className="size-3.5 mr-1.5" />
              Add subtask
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
          >
            {submitting && (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
