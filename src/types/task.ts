import type { LucideIcon } from "lucide-react"
import {
  CheckSquare,
  Mail,
  PenLine,
  ListTodo,
  StickyNote,
  Calendar,
  RotateCcw,
} from "lucide-react"

// ─── Source constants ────────────────────────────────────────────────────────

export const TASK_SOURCES = [
  "todoist",
  "gmail",
  "manual",
  "apple_reminders",
  "apple_notes",
  "apple_mail",
  "google_calendar",
  "routine",
] as const

export type TaskSource = (typeof TASK_SOURCES)[number]

export const SOURCE_ICONS: Record<TaskSource, LucideIcon> = {
  todoist: CheckSquare,
  gmail: Mail,
  manual: PenLine,
  apple_reminders: ListTodo,
  apple_notes: StickyNote,
  apple_mail: Mail,
  google_calendar: Calendar,
  routine: RotateCcw,
}

export const SOURCE_LABELS: Record<TaskSource, string> = {
  todoist: "Todoist",
  gmail: "Gmail",
  manual: "Manual",
  apple_reminders: "Reminders",
  apple_notes: "Notes",
  apple_mail: "Apple Mail",
  google_calendar: "Calendar",
  routine: "Routine",
}

export const SOURCE_COLORS: Record<TaskSource, string> = {
  todoist: "text-red-500",
  gmail: "text-blue-500",
  manual: "text-muted-foreground",
  apple_reminders: "text-purple-500",
  apple_notes: "text-amber-500",
  apple_mail: "text-blue-400",
  google_calendar: "text-green-500",
  routine: "text-cyan-500",
}

// ─── Task item (matches DB row shape) ────────────────────────────────────────

export interface TaskItem {
  id: string
  source: string
  sourceId: string | null
  title: string
  description: string | null
  dueDate: string | null
  dueTime: string | null
  priorityScore: number | null
  priorityManual: number | null
  isCompleted: boolean
  isHidden: boolean
  labels: string
  metadata: string
  createdAt: string
}

// ─── Priority helpers ────────────────────────────────────────────────────────

export const PRIORITY_COLORS: Record<number, string> = {
  5: "bg-destructive/10 text-destructive border-destructive/20",
  4: "bg-warning/10 text-warning border-warning/20",
  3: "bg-muted text-muted-foreground border-border",
}

export const PRIORITY_LABELS: Record<number, string> = {
  5: "Urgent",
  4: "High",
  3: "Medium",
  1: "Normal",
}

// ─── Filter types ────────────────────────────────────────────────────────────

export interface TaskFilters {
  source: string // "all" | TaskSource
  priority: string // "all" | "5" | "4" | "3"
  project: string // "all" | projectId
  dateFilter: "all" | "today" | "week" | "overdue"
}

// ─── Date grouping ───────────────────────────────────────────────────────────

export type DateGroup =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "later"
  | "no_date"

export const DATE_GROUP_LABELS: Record<DateGroup, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This Week",
  later: "Later",
  no_date: "No Date",
}

export const DATE_GROUP_ORDER: DateGroup[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "later",
  "no_date",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseLabels(labelsJson: string): string[] {
  try {
    return JSON.parse(labelsJson) as string[]
  } catch {
    return []
  }
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate + "T00:00:00") < today
}

export function getDateGroup(dueDate: string | null): DateGroup {
  if (!dueDate) return "no_date"

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + "T00:00:00")

  if (due < now) return "overdue"

  const todayStr = now.toISOString().slice(0, 10)
  if (dueDate === todayStr) return "today"

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  if (dueDate === tomorrowStr) return "tomorrow"

  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  if (due <= weekEnd) return "this_week"

  return "later"
}

export function groupTasksByDate(
  tasks: TaskItem[],
): Record<DateGroup, TaskItem[]> {
  const groups: Record<DateGroup, TaskItem[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    later: [],
    no_date: [],
  }

  for (const task of tasks) {
    const group = getDateGroup(task.dueDate)
    groups[group] = [...groups[group], task]
  }

  return groups
}
