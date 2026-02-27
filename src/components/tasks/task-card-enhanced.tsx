"use client"

import { useState, useTransition } from "react"
import { Check, ChevronDown, ChevronRight, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SourceBadge } from "./source-badge"
import { ReschedulePopover } from "./reschedule-popover"
import { PinToContextDialog } from "@/components/life-context/pin-to-context-dialog"
import { cn } from "@/lib/utils"
import {
  type TaskItem,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  parseLabels,
  isOverdue,
} from "@/types/task"

interface TaskCardEnhancedProps {
  task: TaskItem
  onComplete?: (id: string) => Promise<void>
  onReschedule?: (id: string, newDate: string) => Promise<void>
  renderSubtasks?: (taskId: string, sourceId: string | null, source: string) => React.ReactNode
}

export function TaskCardEnhanced({
  task,
  onComplete,
  onReschedule,
  renderSubtasks,
}: TaskCardEnhancedProps) {
  const [done, setDone] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pinOpen, setPinOpen] = useState(false)
  const labels = parseLabels(task.labels)
  const priority = task.priorityManual ?? 1
  const overdue = isOverdue(task.dueDate)

  function handleComplete() {
    if (!onComplete) return
    startTransition(async () => {
      await onComplete(task.id)
      setDone(true)
    })
  }

  if (done) return null

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full flex-shrink-0 mt-0.5",
            "relative before:absolute before:inset-[-6px]",
            "before:rounded-full before:content-['']",
          )}
          onClick={handleComplete}
          disabled={isPending || !onComplete}
          aria-label="Complete task"
        >
          <Check className="h-3 w-3" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SourceBadge source={task.source} />
            {priority > 1 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-1.5 py-0",
                  PRIORITY_COLORS[priority] ?? "",
                )}
              >
                {PRIORITY_LABELS[priority]}
              </Badge>
            )}
          </div>

          <p className="text-sm font-medium leading-snug">{task.title}</p>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {task.dueDate && onReschedule ? (
              <ReschedulePopover
                taskId={task.id}
                currentDate={task.dueDate}
                isOverdue={overdue}
                onReschedule={onReschedule}
              />
            ) : task.dueDate ? (
              <span
                className={cn(
                  "flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5",
                  overdue ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {overdue ? "Overdue" : task.dueDate}
              </span>
            ) : null}
            {labels.slice(0, 3).map((label) => (
              <Badge key={label} variant="secondary" className="text-xs px-2 py-0">
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-violet-500"
            onClick={() => setPinOpen(true)}
            aria-label="Pin to context"
          >
            <MapPin className="size-3.5" />
          </Button>
          {renderSubtasks && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
            >
              {expanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {expanded && renderSubtasks && (
        <div className="pl-10 pt-1">
          {renderSubtasks(task.id, task.sourceId, task.source)}
        </div>
      )}

      <PinToContextDialog
        sourceType="task"
        sourceId={task.id}
        sourceTitle={task.title}
        open={pinOpen}
        onOpenChange={setPinOpen}
      />
    </div>
  )
}
