"use client"

import { useState, useTransition } from "react"
import { Check, Calendar } from "lucide-react"
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
  onComplete?: (taskId: string) => Promise<void>
}

const PRIORITY_COLORS: Record<number, string> = {
  5: "bg-red-100 text-red-700 border-red-200",
  4: "bg-orange-100 text-orange-700 border-orange-200",
  3: "bg-yellow-100 text-yellow-700 border-yellow-200",
  1: "bg-slate-100 text-slate-600 border-slate-200",
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
    if (!onComplete || !task.sourceId) return
    startTransition(async () => {
      await onComplete(task.sourceId!)
      setDone(true)
    })
  }

  if (done) return null

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <Button
        variant="outline"
        size="icon"
        className="h-5 w-5 rounded-full flex-shrink-0 mt-0.5"
        onClick={handleComplete}
        disabled={isPending || !onComplete}
        aria-label="Complete task"
      >
        <Check className="h-3 w-3" />
      </Button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {priority > 1 && (
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0 ${PRIORITY_COLORS[priority] ?? ""}`}
            >
              {PRIORITY_LABELS[priority]}
            </Badge>
          )}
          {task.dueDate && (
            <span
              className={`flex items-center gap-0.5 text-xs ${
                overdue ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {overdue ? "Overdue" : task.dueDate}
            </span>
          )}
          {labels.slice(0, 3).map((label) => (
            <Badge key={label} variant="secondary" className="text-xs px-1.5 py-0">
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
