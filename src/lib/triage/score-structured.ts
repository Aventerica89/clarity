interface TriageScore {
  score: number
  reasoning: string
}

interface TodoistInput {
  priority: number // 1=normal, 2=medium, 3=high, 4=urgent
  dueDate: string | null // YYYY-MM-DD
  title: string
}

interface CalendarInput {
  startAt: string // ISO datetime
  title: string
}

const PRIORITY_BASE: Record<number, number> = { 4: 40, 3: 30, 2: 25, 1: 20 }

export function scoreTodoistTask(input: TodoistInput): TriageScore {
  const base = PRIORITY_BASE[input.priority] ?? 20
  const priorityLabel = ["normal", "medium", "high", "urgent"][input.priority - 1] ?? "normal"

  if (!input.dueDate) {
    return { score: base, reasoning: `${priorityLabel} priority, no due date` }
  }

  const today = new Date().toISOString().split("T")[0]
  const due = input.dueDate

  if (due < today) {
    return { score: Math.min(95, base + 55), reasoning: `${priorityLabel} priority, overdue` }
  }
  if (due === today) {
    return { score: Math.min(85, base + 45), reasoning: `${priorityLabel} priority, due today` }
  }

  const daysUntil = Math.ceil(
    (new Date(due).getTime() - Date.now()) / 86400000
  )

  if (daysUntil <= 2) {
    return { score: Math.min(75, base + 35), reasoning: `${priorityLabel} priority, due in ${daysUntil} day(s)` }
  }
  if (daysUntil <= 7) {
    return { score: Math.min(60, base + 20), reasoning: `${priorityLabel} priority, due in ${daysUntil} days` }
  }

  return { score: base, reasoning: `${priorityLabel} priority, due in ${daysUntil} days` }
}

export function scoreCalendarEvent(input: CalendarInput): TriageScore {
  const hoursUntil = (new Date(input.startAt).getTime() - Date.now()) / 3600000

  if (hoursUntil < 0) return { score: 0, reasoning: "Event already passed" }
  if (hoursUntil <= 4) return { score: 80, reasoning: `Event in ${Math.round(hoursUntil * 60)} min` }
  if (hoursUntil <= 24) return { score: 65, reasoning: "Event today" }
  if (hoursUntil <= 48) return { score: 50, reasoning: "Event tomorrow" }
  if (hoursUntil <= 168) return { score: 35, reasoning: "Event this week" }

  return { score: 20, reasoning: "Event more than a week away" }
}
