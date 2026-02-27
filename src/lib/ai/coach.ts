import { and, asc, desc, eq, gt, gte, isNull, lte, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { events, financialSnapshot, integrations, lifeContextItems, lifeContextUpdates, routineCompletions, routines, routineCosts, tasks, triageQueue, userProfile } from "@/lib/schema"
import { decryptToken } from "@/lib/crypto"

// User timezone — America/Phoenix has no DST (UTC-7 year-round)
const TIMEZONE = process.env.CLARITY_TIMEZONE ?? "America/Phoenix"

type LifeContextItem = { id: string; title: string; description: string; urgency: "monitoring" | "active" | "escalated" | "critical" | "resolved" }
type LifeContextUpdateRow = { contextItemId: string; content: string; severity: string; source: string; createdAt: Date }
type FinancialSnap = { bankBalanceCents: number; monthlyBurnCents: number; notes: string | null } | null

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 0,
  escalated: 1,
  active: 2,
  monitoring: 3,
  resolved: 4,
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: "CRITICAL",
  escalated: "ESCALATED",
  active: "ACTIVE",
  monitoring: "MONITORING",
  resolved: "RESOLVED",
}
type UserProfileData = typeof userProfile.$inferSelect
type RoutineCostRow = typeof routineCosts.$inferSelect

const FREQUENCY_MONTHLY_FACTOR: Record<string, number> = {
  monthly: 1,
  weekly: 52 / 12,
  biweekly: 26 / 12,
  annual: 1 / 12,
}

const HIGH_THRESHOLDS: Partial<Record<string, number>> = {
  insurance: 60000,
  housing: 200000,
  transport: 30000,
}

function toMonthlyCents(amountCents: number, frequency: string): number {
  return Math.round(amountCents * (FREQUENCY_MONTHLY_FACTOR[frequency] ?? 1))
}

function formatProfileBlock(profile: UserProfileData | null): string {
  if (!profile) return ""
  const lines: string[] = ["[About Me]"]
  if (profile.occupation) lines.push(`Occupation: ${profile.occupation}${profile.employer ? ` at ${profile.employer}` : ""}`)
  if (profile.city) lines.push(`Location: ${profile.city}`)
  if (profile.householdType) lines.push(`Household: ${profile.householdType}`)
  if (profile.workSchedule) lines.push(`Work schedule: ${profile.workSchedule}`)
  if (profile.lifePhase) lines.push(`Life phase: ${profile.lifePhase}`)
  if (profile.sideProjects) lines.push(`Side projects: ${profile.sideProjects}`)
  if (profile.healthContext) lines.push(`Health: ${profile.healthContext}`)
  if (profile.lifeValues) lines.push(`What matters most: ${profile.lifeValues}`)
  if (profile.notes) lines.push(`Notes: ${profile.notes}`)
  return lines.length > 1 ? lines.join("\n") : ""
}

function formatRoutineCostsBlock(costs: RoutineCostRow[]): string {
  if (costs.length === 0) return ""
  const totalMonthlyCents = costs.reduce((sum, c) => sum + toMonthlyCents(c.amountCents, c.frequency), 0)
  const total = (totalMonthlyCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
  const lines: string[] = [`[Routine Costs] — ${total}/mo total`]
  for (const cost of costs) {
    const monthly = toMonthlyCents(cost.amountCents, cost.frequency)
    const amt = (cost.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    const freqSuffix = cost.frequency === "monthly" ? "/mo" : cost.frequency === "annual" ? "/yr" : `/${cost.frequency}`
    const monthlyNote = cost.frequency !== "monthly" ? ` (${(monthly / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}/mo)` : ""
    const highFlag = HIGH_THRESHOLDS[cost.category] && monthly > (HIGH_THRESHOLDS[cost.category] ?? 0) ? " high" : ""
    lines.push(`  ${cost.label}: ${amt}${freqSuffix}${monthlyNote}${highFlag}`)
  }
  return lines.join("\n")
}

export function formatLifeContext(
  items: LifeContextItem[],
  snap: FinancialSnap,
  recentUpdates: LifeContextUpdateRow[] = [],
): string {
  if (items.length === 0 && !snap) return ""

  const lines: string[] = ["[Life Context]"]

  // Group updates by context item (max 3 per item, already ordered desc)
  const updatesByItem = new Map<string, LifeContextUpdateRow[]>()
  for (const u of recentUpdates) {
    const existing = updatesByItem.get(u.contextItemId) ?? []
    if (existing.length < 3) {
      existing.push(u)
      updatesByItem.set(u.contextItemId, existing)
    }
  }

  const sorted = [...items].sort((a, b) => {
    return (SEVERITY_WEIGHT[a.urgency] ?? 4) - (SEVERITY_WEIGHT[b.urgency] ?? 4)
  })

  for (const item of sorted) {
    const label = SEVERITY_LABEL[item.urgency] ?? "ACTIVE"
    const desc = item.description ? ` — ${stripHtml(item.description)}` : ""
    lines.push(`${label}: ${item.title}${desc}`)

    const updates = updatesByItem.get(item.id)
    if (updates && updates.length > 0) {
      for (const u of updates) {
        const dateStr = u.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        const sourceTag = u.source === "ai" ? " (AI note)" : ""
        lines.push(`  ${dateStr}: ${stripHtml(u.content)} [${SEVERITY_LABEL[u.severity] ?? u.severity}]${sourceTag}`)
      }
    }
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(d)
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

export async function getTodoistToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ token: integrations.accessTokenEncrypted })
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, "todoist")))
    .limit(1)
  const enc = rows[0]?.token
  return enc ? decryptToken(enc) : null
}

type TaskRow = {
  title: string
  dueDate: string | null
  dueTime: string | null
  priorityManual: number | null
  source: string
  labels: string | null
}

function formatTaskLine(t: TaskRow): string {
  const due = t.dueDate ? ` [due ${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : ""}]` : ""
  const pri = t.priorityManual ? ` (priority ${t.priorityManual}/5)` : ""
  const src = `, ${t.source}`
  let labelsStr = ""
  if (t.labels) {
    try {
      const parsed = JSON.parse(t.labels) as string[]
      if (parsed.length > 0) labelsStr = ` [${parsed.join(", ")}]`
    } catch {
      // Ignore malformed labels
    }
  }
  return `  - ${t.title}${due}${pri}${src}${labelsStr}`
}

export async function buildContext(userId: string, now: Date): Promise<string> {
  const today = todayString()
  const sevenDaysOut = addDays(today, 7)

  const nextThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  const taskSelect = {
    title: tasks.title,
    dueDate: tasks.dueDate,
    dueTime: tasks.dueTime,
    priorityManual: tasks.priorityManual,
    source: tasks.source,
    labels: tasks.labels,
  }

  const [
    upcomingEvents,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    todayRoutines,
    todayCompletions,
    lifeContextRows,
    financialRows,
    profileRows,
    costsRows,
    triageRows,
    contextUpdateRows,
  ] = await Promise.all([
    // Next 3 hours of events
    db
      .select({ title: events.title, startAt: events.startAt, endAt: events.endAt, location: events.location })
      .from(events)
      .where(and(eq(events.userId, userId), gte(events.startAt, now), lte(events.startAt, nextThreeHours)))
      .orderBy(asc(events.startAt))
      .limit(5),

    // Overdue tasks (dueDate < today, not completed)
    db
      .select(taskSelect)
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.isCompleted, false),
        // has a dueDate AND it's before today
        gt(tasks.dueDate, ""),
        lte(tasks.dueDate, today),
      ))
      .orderBy(asc(tasks.dueDate), asc(tasks.priorityManual))
      .limit(20),

    // Tasks due today (dueDate = today, not completed)
    db
      .select(taskSelect)
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.isCompleted, false),
        eq(tasks.dueDate, today),
      ))
      .orderBy(asc(tasks.priorityManual))
      .limit(20),

    // Upcoming tasks (dueDate in next 7 days, not today, not completed)
    db
      .select(taskSelect)
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.isCompleted, false),
        gt(tasks.dueDate, today),
        lte(tasks.dueDate, sevenDaysOut),
      ))
      .orderBy(asc(tasks.dueDate), asc(tasks.priorityManual))
      .limit(20),

    // Tasks with no due date (not completed)
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
        id: lifeContextItems.id,
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

    // User profile
    db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1),

    // Routine costs
    db.select().from(routineCosts).where(and(eq(routineCosts.userId, userId), eq(routineCosts.isActive, true))),

    // Pending triage items (high-priority items needing attention)
    db
      .select({
        title: triageQueue.title,
        snippet: triageQueue.snippet,
        source: triageQueue.source,
        aiScore: triageQueue.aiScore,
        aiReasoning: triageQueue.aiReasoning,
      })
      .from(triageQueue)
      .where(and(eq(triageQueue.userId, userId), eq(triageQueue.status, "pending")))
      .orderBy(desc(triageQueue.aiScore))
      .limit(15),

    // Recent life context updates (last 3 per item, newest first)
    db
      .select({
        contextItemId: lifeContextUpdates.contextItemId,
        content: lifeContextUpdates.content,
        severity: lifeContextUpdates.severity,
        source: lifeContextUpdates.source,
        createdAt: lifeContextUpdates.createdAt,
      })
      .from(lifeContextUpdates)
      .where(eq(lifeContextUpdates.userId, userId))
      .orderBy(desc(lifeContextUpdates.createdAt))
      .limit(30),
  ])

  // Deduplicate: overdue query may include today's tasks if lte boundary is inclusive
  const todaySet = new Set(todayTasks.map((t) => t.title))
  const trueOverdue = overdueTasks.filter((t) => t.dueDate !== today && !todaySet.has(t.title))

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

  const profileBlock = formatProfileBlock(profileRows[0] ?? null)
  const costsBlock = formatRoutineCostsBlock(costsRows)
  const lifeContextBlock = formatLifeContext(lifeContextRows, financialRows[0] ?? null, contextUpdateRows)

  const lines: string[] = []

  if (profileBlock) {
    lines.push(profileBlock)
    lines.push("")
  }

  if (costsBlock) {
    lines.push(costsBlock)
    lines.push("")
  }

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

  const hasAnyTasks = trueOverdue.length > 0 || todayTasks.length > 0 || upcomingTasks.length > 0

  if (hasAnyTasks) {
    lines.push("[Tasks]")

    if (trueOverdue.length > 0) {
      lines.push(`Overdue (${trueOverdue.length}):`)
      for (const t of trueOverdue) lines.push(formatTaskLine(t))
    }

    if (todayTasks.length > 0) {
      lines.push(`Today (${todayTasks.length}):`)
      for (const t of todayTasks) lines.push(formatTaskLine(t))
    }

    if (upcomingTasks.length > 0) {
      lines.push(`Upcoming 7 days (${upcomingTasks.length}):`)
      for (const t of upcomingTasks) lines.push(formatTaskLine(t))
    }

    // Summary line
    const totalTasks = trueOverdue.length + todayTasks.length + upcomingTasks.length
    const allTasks = [...trueOverdue, ...todayTasks, ...upcomingTasks]
    const todoistCount = allTasks.filter((t) => t.source === "todoist").length
    const summaryParts: string[] = []
    if (trueOverdue.length > 0) summaryParts.push(`${trueOverdue.length} overdue`)
    if (todayTasks.length > 0) summaryParts.push(`${todayTasks.length} today`)
    if (upcomingTasks.length > 0) summaryParts.push(`${upcomingTasks.length} upcoming`)
    const fromTodoist = todoistCount > 0 ? ` ${todoistCount}/${totalTasks} from Todoist.` : ""
    lines.push(`Task summary: ${summaryParts.join(", ")}.${fromTodoist}`)
    lines.push("")
  }

  if (triageRows.length > 0) {
    lines.push(`[Triage Queue] — ${triageRows.length} item(s) flagged for attention`)
    for (const t of triageRows) {
      const src = t.source === "todoist" ? "Todoist" : t.source === "gmail" ? "Gmail" : t.source === "google_calendar" ? "Calendar" : t.source
      const desc = t.snippet ? ` — ${t.snippet.slice(0, 100)}` : ""
      lines.push(`  - [${src}, score ${t.aiScore}] ${t.title}${desc} (${t.aiReasoning})`)
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

  if (!hasAnyTasks && pendingRoutines.length === 0 && upcomingEvents.length === 0) {
    lines.push("No pending tasks, routines, or upcoming events.")
  }

  return lines.join("\n").trim()
}
