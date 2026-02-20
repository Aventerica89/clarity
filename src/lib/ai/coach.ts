import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { events, integrations, routineCompletions, routines, tasks } from "@/lib/schema"
import { decryptToken } from "@/lib/crypto"

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export async function getAnthropicToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ token: integrations.accessTokenEncrypted })
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, "anthropic")))
    .limit(1)
  const enc = rows[0]?.token
  return enc ? decryptToken(enc) : null
}

export async function getGeminiToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ token: integrations.accessTokenEncrypted })
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, "gemini")))
    .limit(1)
  const enc = rows[0]?.token
  return enc ? decryptToken(enc) : null
}

export async function buildContext(userId: string, now: Date): Promise<string> {
  const today = todayString()

  const nextThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  const [upcomingEvents, pendingTasks, todayRoutines, todayCompletions] = await Promise.all([
    // Next 3 hours of events
    db
      .select({ title: events.title, startAt: events.startAt, endAt: events.endAt, location: events.location })
      .from(events)
      .where(and(eq(events.userId, userId), gte(events.startAt, now), lte(events.startAt, nextThreeHours)))
      .orderBy(asc(events.startAt))
      .limit(5),

    // Overdue + today's tasks, not completed
    db
      .select({ title: tasks.title, dueDate: tasks.dueDate, dueTime: tasks.dueTime, priorityManual: tasks.priorityManual, priorityScore: tasks.priorityScore, source: tasks.source })
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.isCompleted, false),
        or(isNull(tasks.dueDate), lte(tasks.dueDate, today)),
      ))
      .orderBy(asc(tasks.dueDate), asc(tasks.priorityManual))
      .limit(20),

    // Active routines scheduled for any day (filter in JS for simplicity)
    db
      .select({ id: routines.id, title: routines.title, preferredTime: routines.preferredTime, frequency: routines.frequency, customDays: routines.customDays })
      .from(routines)
      .where(and(eq(routines.userId, userId), eq(routines.isActive, true))),

    // Which routines are already done today
    db
      .select({ routineId: routineCompletions.routineId })
      .from(routineCompletions)
      .where(and(eq(routineCompletions.userId, userId), eq(routineCompletions.completedDate, today))),
  ])

  const completedRoutineIds = new Set(todayCompletions.map((r) => r.routineId))
  const dayOfWeek = now.getDay() // 0=Sun..6=Sat

  const pendingRoutines = todayRoutines.filter((r) => {
    if (completedRoutineIds.has(r.id)) return false
    if (r.frequency === "daily") return true
    if (r.frequency === "weekdays") return dayOfWeek >= 1 && dayOfWeek <= 5
    if (r.frequency === "weekends") return dayOfWeek === 0 || dayOfWeek === 6
    if (r.frequency === "custom" && r.customDays) {
      const days: number[] = JSON.parse(r.customDays)
      return days.includes(dayOfWeek)
    }
    return false
  })

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  const dayStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  const lines: string[] = [
    `Current time: ${timeStr}, ${dayStr}`,
    "",
  ]

  if (upcomingEvents.length > 0) {
    lines.push("Upcoming events (next 3 hours):")
    for (const ev of upcomingEvents) {
      const start = ev.startAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
      lines.push(`  - ${ev.title} at ${start}${ev.location ? ` (${ev.location})` : ""}`)
    }
    lines.push("")
  }

  if (pendingTasks.length > 0) {
    lines.push("Pending tasks:")
    for (const t of pendingTasks) {
      const due = t.dueDate ? ` [due ${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : ""}]` : ""
      const pri = t.priorityManual ? ` (priority ${t.priorityManual}/5)` : ""
      lines.push(`  - ${t.title}${due}${pri}`)
    }
    lines.push("")
  }

  if (pendingRoutines.length > 0) {
    lines.push("Routines not yet done today:")
    for (const r of pendingRoutines) {
      const time = r.preferredTime ? ` (preferred ${r.preferredTime})` : ""
      lines.push(`  - ${r.title}${time}`)
    }
    lines.push("")
  }

  if (pendingTasks.length === 0 && pendingRoutines.length === 0 && upcomingEvents.length === 0) {
    lines.push("No pending tasks, routines, or upcoming events.")
  }

  return lines.join("\n").trim()
}
