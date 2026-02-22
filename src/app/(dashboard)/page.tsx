import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { events, financialSnapshot, lifeContextItems, tasks } from "@/lib/schema"
import { EventCard } from "@/components/dashboard/event-card"
import { TaskCard } from "@/components/dashboard/task-card"
import { CoachPanel } from "@/components/dashboard/coach-panel"
import { LifeContextStrip } from "@/components/dashboard/life-context-strip"

const TIMEZONE = "America/Phoenix"

function todayRange() {
  // Compute midnight-to-midnight in Phoenix time, expressed as UTC Date objects
  const nowStr = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
  const start = new Date(`${nowStr}T00:00:00`)
  const end = new Date(`${nowStr}T23:59:59.999`)
  // Adjust for Phoenix offset (UTC-7, no DST)
  const offsetMs = 7 * 60 * 60 * 1000
  return { start: new Date(start.getTime() + offsetMs), end: new Date(end.getTime() + offsetMs) }
}

function todayDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
}

export default async function TodayPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const { start, end } = todayRange()
  const today = todayDateString()

  const [todayEvents, pendingTasks, lifeContextRows, financialRows] =
    await Promise.all([
      db
        .select()
        .from(events)
        .where(and(eq(events.userId, userId), gte(events.startAt, start), lte(events.startAt, end)))
        .orderBy(asc(events.startAt))
        .limit(20),

      db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.isCompleted, false),
            or(isNull(tasks.dueDate), lte(tasks.dueDate, today)),
          ),
        )
        .orderBy(asc(tasks.dueDate), asc(tasks.priorityManual))
        .limit(30),

      db
        .select({
          id: lifeContextItems.id,
          title: lifeContextItems.title,
          urgency: lifeContextItems.urgency,
        })
        .from(lifeContextItems)
        .where(and(eq(lifeContextItems.userId, userId), eq(lifeContextItems.isActive, true)))
        .orderBy(desc(lifeContextItems.urgency)),

      db
        .select({
          bankBalanceCents: financialSnapshot.bankBalanceCents,
          monthlyBurnCents: financialSnapshot.monthlyBurnCents,
        })
        .from(financialSnapshot)
        .where(eq(financialSnapshot.userId, userId))
        .limit(1),
    ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-muted-foreground text-sm">Your unified view</p>
      </div>

      <CoachPanel />

      <LifeContextStrip
        items={lifeContextRows}
        snapshot={financialRows[0] ?? null}
      />

      <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tasks
            {pendingTasks.length > 0 && <span className="ml-1.5 normal-case">({pendingTasks.length})</span>}
          </h2>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending tasks. Connect Todoist in Settings to sync.
            </p>
          ) : (
            pendingTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={{
                  id: t.id,
                  title: t.title,
                  source: t.source,
                  sourceId: t.sourceId,
                  dueDate: t.dueDate,
                  priorityManual: t.priorityManual,
                  labels: t.labels,
                }}
              />
            ))
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Events
            {todayEvents.length > 0 && <span className="ml-1.5 normal-case">({todayEvents.length})</span>}
          </h2>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events today. Connect Google Calendar in Settings to sync.
            </p>
          ) : (
            todayEvents.map((ev) => (
              <EventCard
                key={ev.id}
                event={{
                  id: ev.id,
                  title: ev.title,
                  startAt: ev.startAt,
                  endAt: ev.endAt,
                  isAllDay: ev.isAllDay,
                  location: ev.location,
                  calendarName: ev.calendarName,
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
