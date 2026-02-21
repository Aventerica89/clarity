import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { events, financialSnapshot, integrations, lifeContextItems, routineCompletions, routines, tasks } from "@/lib/schema"
import { decryptToken } from "@/lib/crypto"

// User timezone — America/Phoenix has no DST (UTC-7 year-round)
const TIMEZONE = process.env.CLARITY_TIMEZONE ?? "America/Phoenix"

type LifeContextItem = { title: string; description: string; urgency: "active" | "critical" }
type FinancialSnap = { bankBalanceCents: number; monthlyBurnCents: number; notes: string | null } | null

export function formatLifeContext(items: LifeContextItem[], snap: FinancialSnap): string {
  if (items.length === 0 && !snap) return ""

  const lines: string[] = ["[Life Context]"]

  const sorted = [...items].sort((a, b) => {
    if (a.urgency === b.urgency) return 0
    return a.urgency === "critical" ? -1 : 1
  })
  for (const item of sorted) {
    const label = item.urgency === "critical" ? "CRITICAL" : "ACTIVE"
    lines.push(`${label}: ${item.title}${item.description ? ` — ${item.description}` : ""}`)
  }

  if (snap && (snap.bankBalanceCents > 0 || snap.monthlyBurnCents > 0)) {
    lines.push("")
    lines.push("[Financial Context]")
    const bank = (snap.bankBalanceCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })
    const burn = (snap.monthlyBurnCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })
    const runway = snap.monthlyBurnCents > 0
      ? (snap.bankBalanceCents / snap.monthlyBurnCents).toFixed(1)
      : null
    const runwayStr = runway ? ` | Runway: ~${runway} months` : ""
    lines.push(`Bank: $${bank} | Burn: $${burn}/mo${runwayStr}`)
    if (snap.notes) lines.push(`Note: ${snap.notes}`)
  }

  return lines.join("\n")
}

function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
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

export async function getDeepSeekToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ token: integrations.accessTokenEncrypted })
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, "deepseek")))
    .limit(1)
  const enc = rows[0]?.token
  return enc ? decryptToken(enc) : null
}

export async function getGroqToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ token: integrations.accessTokenEncrypted })
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, "groq")))
    .limit(1)
  const enc = rows[0]?.token
  return enc ? decryptToken(enc) : null
}

export async function buildContext(userId: string, now: Date): Promise<string> {
  const today = todayString()

  const nextThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  const [upcomingEvents, pendingTasks, todayRoutines, todayCompletions, lifeContextRows, financialRows] = await Promise.all([
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

    // Active life context items
    db
      .select({
        title: lifeContextItems.title,
        description: lifeContextItems.description,
        urgency: lifeContextItems.urgency,
      })
      .from(lifeContextItems)
      .where(and(eq(lifeContextItems.userId, userId), eq(lifeContextItems.isActive, true)))
      .orderBy(desc(lifeContextItems.urgency)),

    // Financial snapshot (one row per user)
    db
      .select({
        bankBalanceCents: financialSnapshot.bankBalanceCents,
        monthlyBurnCents: financialSnapshot.monthlyBurnCents,
        notes: financialSnapshot.notes,
      })
      .from(financialSnapshot)
      .where(eq(financialSnapshot.userId, userId))
      .limit(1),
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

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TIMEZONE })
  const dayStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: TIMEZONE })

  const lifeContextBlock = formatLifeContext(lifeContextRows, financialRows[0] ?? null)

  const lines: string[] = []

  if (lifeContextBlock) {
    lines.push(lifeContextBlock)
    lines.push("")
  }

  lines.push(`Current time: ${timeStr}, ${dayStr}`)
  lines.push("")

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
