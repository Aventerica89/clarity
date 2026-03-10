"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import type { TriageItem } from "./triage-card"
import { SourceBadge } from "./source-badge"

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [breakpoint])
  return isMobile
}

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
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-[#EFEFEF] dark:stroke-[#2A2A2A]"
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
              : "stroke-[#1E2432] dark:stroke-[#E8E8E8]"
          )}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold text-[#1E2432] dark:text-[#E8E8E8]">
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
  const isOverdue = isTodoist
    ? (() => {
        const meta = JSON.parse(item.sourceMetadata || "{}") as { due?: string }
        if (!meta.due) return false
        return new Date(meta.due) < new Date()
      })()
    : false

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
      const apiAction = action === "pin" ? "push_to_context" : action
      const res = await fetch(`/api/triage/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: apiAction }),
      })
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      if (action === "complete") onComplete(item.id)
      else if (action === "approve") onApprove(item)
      else onPin(item.id)
    } catch (err) {
      console.error(`[subtask-modal] ${action} error:`, err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="space-y-3 px-5 pt-5 pb-2">
        <p className="text-[16px] font-semibold leading-snug text-[#1E2432] dark:text-[#E8E8E8]">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5">
          <SourceBadge source={item.source} />
          {isOverdue && (
            <>
              <span className="text-xs text-[#ABABAB] dark:text-[#666]">·</span>
              <span className="text-xs font-medium text-[#E5484D]">
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
          rows={3}
          className="w-full resize-none rounded-[10px] border border-[#EFEFEF] bg-[#FAFAFA] px-3 py-2.5 text-[13px] leading-[1.5] text-[#1E2432] placeholder:text-[#ABABAB] outline-none transition-colors focus:border-[#D4D4D4] focus:bg-white dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-[#E8E8E8] dark:placeholder:text-[#555] dark:focus:border-[#444] dark:focus:bg-[#222]"
        />
      </div>

      {/* Progress */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-3">
          <ProgressRing completed={completed.length} total={subtasks.length} />
          <div>
            <p className="text-sm font-medium text-[#1E2432] dark:text-[#E8E8E8]">
              {completed.length} of {subtasks.length} complete
            </p>
            <p className="text-xs text-[#8A8A8A]">
              {remaining.length} remaining
            </p>
          </div>
        </div>
      )}

      {loadingSubtasks && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-[#8A8A8A]" />
        </div>
      )}

      {/* Subtask List */}
      {!loadingSubtasks && subtasks.length > 0 && (
        <div className="max-h-[40vh] overflow-y-auto px-5 scrollbar-none">
          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-1 pb-3">
              <p className="flex items-center gap-1.5 text-xs text-[#8A8A8A] pb-1">
                <CheckCircle2 className="size-3" />
                Completed {completed.length}
              </p>
              {subtasks.map((s, i) =>
                s.done ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSubtask(i)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#F5F4F2] dark:hover:bg-[#1A1A1A]"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-[#8A8A8A]" />
                    <span className="text-sm text-[#8A8A8A] line-through">
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
              <p className="flex items-center gap-1.5 text-xs text-[#8A8A8A] pb-1">
                <Circle className="size-3" />
                Remaining {remaining.length}
              </p>
              {subtasks.map((s, i) =>
                !s.done ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSubtask(i)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#F5F4F2] dark:hover:bg-[#1A1A1A]"
                  >
                    <Circle className="size-4 shrink-0 text-[#ABABAB] dark:text-[#555]" />
                    <span className="text-sm text-[#1E2432] dark:text-[#E8E8E8]">{s.text}</span>
                  </button>
                ) : null
              )}
            </div>
          )}
        </div>
      )}

      {/* Add subtask input */}
      <div className="flex items-center gap-2 border-t border-[#EFEFEF] px-5 py-3 dark:border-[#2A2A2A]">
        <Plus className="size-4 shrink-0 text-[#ABABAB] dark:text-[#555]" />
        <input
          type="text"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSubtask()}
          placeholder="Add a subtask..."
          className="flex-1 bg-transparent text-sm text-[#1E2432] placeholder:text-[#ABABAB] outline-none dark:text-[#E8E8E8] dark:placeholder:text-[#555]"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 border-t border-[#EFEFEF] px-5 py-4 dark:border-[#2A2A2A]">
        <button
          type="button"
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#1E2432] text-sm font-semibold text-white transition-colors hover:bg-[#2a3347] disabled:opacity-50 dark:bg-[#E8E8E8] dark:text-[#1E2432] dark:hover:bg-[#D4D4D4]"
          onClick={() => handleAction("complete")}
          disabled={actionLoading !== null}
        >
          <CheckCircle2 className="size-[15px]" />
          {actionLoading === "complete" ? "..." : "Complete All"}
        </button>
        <button
          type="button"
          className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#E8E8E8] px-4 text-sm font-medium text-[#1E2432] transition-colors hover:bg-[#EAEAEA] disabled:opacity-50 dark:border-[#333] dark:text-[#E8E8E8] dark:hover:bg-[#2A2A2A]"
          onClick={() => handleAction("approve")}
          disabled={actionLoading !== null}
        >
          <ThumbsUp className="size-[15px] text-[#8A8A8A]" />
          {actionLoading === "approve" ? "..." : "Approve"}
        </button>
        <button
          type="button"
          className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#E8E8E8] px-4 text-sm font-medium text-[#1E2432] transition-colors hover:bg-[#EAEAEA] disabled:opacity-50 dark:border-[#333] dark:text-[#E8E8E8] dark:hover:bg-[#2A2A2A]"
          onClick={() => handleAction("pin")}
          disabled={actionLoading !== null}
        >
          <Pin className="size-[15px] text-[#8A8A8A]" />
          {actionLoading === "pin" ? "..." : "Pin"}
        </button>
        <button
          type="button"
          className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] px-4 text-sm font-medium text-[#8A8A8A] transition-colors hover:text-[#1E2432] dark:hover:text-[#E8E8E8]"
          onClick={onClose}
        >
          <X className="size-[15px]" />
          Close
        </button>
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
