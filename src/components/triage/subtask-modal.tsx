"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  CheckCircle2,
  Circle,
  Loader2,
  Pin,
  Plus,
  ThumbsUp,
  X,
} from "lucide-react"
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
import type { TriageItem } from "@/types/triage"
import { parseSourceMetadata, formatSenderName } from "@/types/triage"
import { SourceBadge } from "@/components/tasks/source-badge"
import { useIsMobile } from "@/lib/use-mobile"

interface SubtaskModalProps {
  item: TriageItem | null
  onClose: () => void
  onComplete: (id: string) => void
  onApprove: (item: TriageItem) => void
  onPin: (id: string) => void
}

interface Subtask {
  text: string
  done: boolean
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const size = 48
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? completed / total : 0
  const offset = circumference * (1 - progress)

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${completed} of ${total} subtasks complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-border"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(
            "transition-all duration-300",
            progress === 1
              ? "stroke-[#4CAF50]"
              : "stroke-foreground"
          )}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold text-foreground">
        {completed}/{total}
      </span>
    </div>
  )
}

function SubtaskModalContent({
  item,
  onClose,
  onComplete,
  onApprove,
  onPin,
}: SubtaskModalProps & { item: TriageItem }) {
  const [description, setDescription] = useState(item.snippet ?? "")
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [newSubtask, setNewSubtask] = useState("")
  const [actionLoading, setActionLoading] = useState<"complete" | "approve" | "pin" | null>(null)

  const isTodoist = item.source === "todoist"
  const meta = useMemo(() => parseSourceMetadata(item.sourceMetadata), [item.sourceMetadata])
  const isOverdue = isTodoist && meta.due ? new Date(meta.due) < new Date() : false

  const completed = subtasks.filter((s) => s.done)
  const remaining = subtasks.filter((s) => !s.done)

  const loadSubtasks = useCallback(async () => {
    setLoadingSubtasks(true)
    try {
      const res = await fetch(`/api/triage/${item.id}/approve`)
      const data = (await res.json()) as { subtasks?: string[] }
      setSubtasks(
        (data.subtasks ?? []).map((text) => ({ text, done: false }))
      )
    } catch {
      // AI subtasks are best-effort
    } finally {
      setLoadingSubtasks(false)
    }
  }, [item.id])

  useEffect(() => {
    loadSubtasks()
  }, [loadSubtasks])

  function toggleSubtask(index: number) {
    setSubtasks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, done: !s.done } : s))
    )
  }

  function addSubtask() {
    const text = newSubtask.trim()
    if (!text) return
    setSubtasks((prev) => [...prev, { text, done: false }])
    setNewSubtask("")
  }

  async function handleAction(action: "complete" | "approve" | "pin") {
    setActionLoading(action)
    try {
      if (action === "complete") await Promise.resolve(onComplete(item.id))
      else if (action === "approve") await Promise.resolve(onApprove(item))
      else await Promise.resolve(onPin(item.id))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="space-y-3 px-5 pt-5 pb-2">
        <p className="text-[16px] font-semibold leading-snug text-foreground">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5">
          <SourceBadge source={item.source} />
          {isOverdue && (
            <>
              <span className="text-xs text-muted-foreground/60">·</span>
              <span className="text-xs font-medium text-destructive">
                Overdue
              </span>
            </>
          )}
        </div>

        {/* Description (editable) */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          aria-label="Task description"
          rows={3}
          className="w-full resize-none rounded-[10px] border bg-muted/50 px-3 py-2.5 text-[13px] leading-[1.5] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-ring focus:bg-background"
        />
      </div>

      {/* Progress */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-3">
          <ProgressRing completed={completed.length} total={subtasks.length} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {completed.length} of {subtasks.length} complete
            </p>
            <p className="text-xs text-muted-foreground">
              {remaining.length} remaining
            </p>
          </div>
        </div>
      )}

      {loadingSubtasks && (
        <div className="flex justify-center py-6" aria-busy="true">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Subtask List */}
      {!loadingSubtasks && subtasks.length > 0 && (
        <div className="max-h-[40vh] overflow-y-auto px-5 scrollbar-none">
          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-1 pb-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1">
                <CheckCircle2 className="size-3" />
                Completed {completed.length}
              </p>
              {subtasks.map((s, i) =>
                s.done ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSubtask(i)}
                    aria-pressed={true}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground line-through">
                      {s.text}
                    </span>
                  </button>
                ) : null
              )}
            </div>
          )}

          {/* Remaining */}
          {remaining.length > 0 && (
            <div className="space-y-1 pb-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1">
                <Circle className="size-3" />
                Remaining {remaining.length}
              </p>
              {subtasks.map((s, i) =>
                !s.done ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSubtask(i)}
                    aria-pressed={false}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <Circle className="size-4 shrink-0 text-muted-foreground/60" />
                    <span className="text-sm text-foreground">{s.text}</span>
                  </button>
                ) : null
              )}
            </div>
          )}
        </div>
      )}

      {/* Add subtask input */}
      <div className="flex items-center gap-2 border-t px-5 py-3">
        <Plus className="size-4 shrink-0 text-muted-foreground/60" />
        <input
          type="text"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSubtask()}
          placeholder="Add a subtask..."
          aria-label="New subtask"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 border-t px-5 py-4">
        <Button
          className="h-10 flex-1 rounded-[10px] text-sm font-semibold"
          onClick={() => handleAction("complete")}
          disabled={actionLoading !== null}
          aria-label="Complete all subtasks"
        >
          <CheckCircle2 className="size-[15px]" />
          {actionLoading === "complete" ? <Loader2 className="size-4 animate-spin" /> : "Complete All"}
        </Button>
        <Button
          variant="outline"
          className="h-10 rounded-[10px] text-sm font-medium"
          onClick={() => handleAction("approve")}
          disabled={actionLoading !== null}
          aria-label="Approve task"
        >
          <ThumbsUp className="size-[15px]" />
          {actionLoading === "approve" ? <Loader2 className="size-4 animate-spin" /> : "Approve"}
        </Button>
        <Button
          variant="outline"
          className="h-10 rounded-[10px] text-sm font-medium"
          onClick={() => handleAction("pin")}
          disabled={actionLoading !== null}
          aria-label="Pin to context"
        >
          <Pin className="size-[15px]" />
          {actionLoading === "pin" ? <Loader2 className="size-4 animate-spin" /> : "Pin"}
        </Button>
        <Button
          variant="ghost"
          className="h-10 rounded-[10px] text-sm font-medium text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X className="size-[15px]" />
          Close
        </Button>
      </div>
    </div>
  )
}

export function SubtaskModal({ item, onClose, onComplete, onApprove, onPin }: SubtaskModalProps) {
  const isMobile = useIsMobile()
  const open = !!item
  const lastItemRef = useRef<TriageItem | null>(null)

  if (item) lastItemRef.current = item
  const displayItem = lastItemRef.current

  const content = displayItem ? (
    <SubtaskModalContent
      key={displayItem.id}
      item={displayItem}
      onClose={onClose}
      onComplete={onComplete}
      onApprove={onApprove}
      onPin={onPin}
    />
  ) : null

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent>
          <DrawerTitle className="sr-only">Subtasks</DrawerTitle>
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-[16px]" showCloseButton={false}>
        <DialogTitle className="sr-only">Subtasks</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  )
}
