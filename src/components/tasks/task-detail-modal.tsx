"use client"

import { useState, useRef, useCallback } from "react"
import { Check, EyeOff, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"
import { SubtaskList } from "@/components/tasks/subtask-list"
import { SourceBadge } from "@/components/tasks/source-badge"
import { useIsMobile } from "@/lib/use-mobile"
import { type TaskItem, isOverdue } from "@/types/task"

interface TaskDetailModalProps {
  task: TaskItem | null
  onClose: () => void
  onComplete?: (id: string) => void
  onHide?: (id: string) => void
  onDescriptionSaved?: (id: string, description: string) => void
}

function TaskDetailContent({
  task,
  onClose,
  onComplete,
  onHide,
  onDescriptionSaved,
}: TaskDetailModalProps & { task: TaskItem }) {
  const [description, setDescription] = useState(task.description ?? "")
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<"complete" | "hide" | null>(null)
  const savedRef = useRef(task.description ?? "")

  const saveDescription = useCallback(async () => {
    if (description === savedRef.current) return
    setSaving(true)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description || null }),
      })
      savedRef.current = description
      onDescriptionSaved?.(task.id, description)
    } catch {
      // Best-effort — don't block UX
    } finally {
      setSaving(false)
    }
  }, [task.id, description, onDescriptionSaved])

  async function handleAction(action: "complete" | "hide") {
    setActionLoading(action)
    try {
      if (action === "complete") await Promise.resolve(onComplete?.(task.id))
      else await Promise.resolve(onHide?.(task.id))
      onClose()
    } finally {
      setActionLoading(null)
    }
  }

  const overdue = isOverdue(task.dueDate)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="space-y-3 px-5 pt-5 pb-4">
        <p className="text-[16px] font-semibold leading-snug text-foreground">
          {task.title}
        </p>
        <div className="flex items-center gap-1.5">
          <SourceBadge source={task.source} />
          {task.dueDate && (
            <>
              <span className="text-xs text-muted-foreground/60">·</span>
              <span className={cn("text-xs font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
                {overdue ? "Overdue · " : ""}{task.dueDate}
              </span>
            </>
          )}
        </div>

        {/* Description */}
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="Add a description..."
            aria-label="Task description"
            rows={3}
            className="w-full resize-none rounded-[10px] border bg-muted/50 px-3 py-2.5 text-[13px] leading-[1.5] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-ring focus:bg-background"
          />
          {saving && (
            <Loader2 className="absolute right-2.5 bottom-2.5 size-3 animate-spin text-muted-foreground/60" />
          )}
        </div>
      </div>

      {/* Subtasks */}
      <div className="border-t px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Subtasks</p>
        <SubtaskList taskId={task.id} sourceId={task.sourceId} source={task.source} />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 border-t px-5 py-4">
        {onComplete && (
          <Button
            className="h-10 flex-1 rounded-[10px] text-sm font-semibold"
            onClick={() => handleAction("complete")}
            disabled={actionLoading !== null}
          >
            <Check className="size-[15px]" />
            {actionLoading === "complete" ? <Loader2 className="size-4 animate-spin" /> : "Complete"}
          </Button>
        )}
        {onHide && (
          <Button
            variant="outline"
            className="h-10 rounded-[10px] text-sm font-medium"
            onClick={() => handleAction("hide")}
            disabled={actionLoading !== null}
          >
            <EyeOff className="size-[15px]" />
            {actionLoading === "hide" ? <Loader2 className="size-4 animate-spin" /> : "Hide"}
          </Button>
        )}
        <Button
          variant="ghost"
          className="h-10 rounded-[10px] text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-[15px]" />
          Close
        </Button>
      </div>
    </div>
  )
}

export function TaskDetailModal({
  task,
  onClose,
  onComplete,
  onHide,
  onDescriptionSaved,
}: TaskDetailModalProps) {
  const isMobile = useIsMobile()
  const open = !!task
  const lastTaskRef = useRef<TaskItem | null>(null)

  if (task) lastTaskRef.current = task
  const displayTask = lastTaskRef.current

  const content = displayTask ? (
    <TaskDetailContent
      key={displayTask.id}
      task={displayTask}
      onClose={onClose}
      onComplete={onComplete}
      onHide={onHide}
      onDescriptionSaved={onDescriptionSaved}
    />
  ) : null

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent>
          <DrawerTitle className="sr-only">Task Details</DrawerTitle>
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-[16px]" showCloseButton={false}>
        <DialogTitle className="sr-only">Task Details</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  )
}
