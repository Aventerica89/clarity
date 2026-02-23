"use client"

import { useState, useTransition } from "react"
import { Check, Calendar, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface TaskItem {
  id: string
  title: string
  source: string
  sourceId: string | null
  dueDate: string | null
  priorityManual: number | null
  labels: string
}

interface TaskCardProps {
  task: TaskItem
  onComplete?: (id: string) => Promise<void>
}

const PRIORITY_COLORS: Record<number, string> = {
  5: "bg-destructive/10 text-destructive border-destructive/20",
  4: "bg-warning/10 text-warning border-warning/20",
  3: "bg-muted text-muted-foreground border-border",
}

const PRIORITY_LABELS: Record<number, string> = {
  5: "Urgent",
  4: "High",
  3: "Medium",
  1: "Normal",
}

function parseLabels(labelsJson: string): string[] {
  try {
    return JSON.parse(labelsJson) as string[]
  } catch {
    return []
  }
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
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
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full flex-shrink-0 relative before:absolute before:inset-[-6px] before:rounded-full before:content-['']"
        onClick={handleComplete}
        disabled={isPending || !onComplete}
        aria-label="Complete task"
      >
        <Check className="h-3 w-3" />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <p className="text-[13px] font-medium leading-snug">{task.title}</p>
          {task.source === "todoist" && task.sourceId && (
            <a
              href={`https://todoist.com/app/task/${task.sourceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Open in Todoist"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {priority > 1 && (
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0 ${PRIORITY_COLORS[priority] ?? ""}`}
            >
              {PRIORITY_LABELS[priority]}
            </Badge>
          )}
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 font-mono text-[11px] ${
                overdue ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              <Calendar className="size-3" />
              {overdue ? "Overdue" : task.dueDate}
            </span>
          )}
          {labels.slice(0, 3).map((label) => (
            <Badge key={label} variant="secondary" className="text-xs px-2 py-0">
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
