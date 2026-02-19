import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { events, integrations, tasks } from "@/lib/schema"
import { EventCard } from "@/components/dashboard/event-card"
import { TaskCard } from "@/components/dashboard/task-card"
import { CoachPanel } from "@/components/dashboard/coach-panel"

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function todayDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default async function TodayPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const { start, end } = todayRange()
  const today = todayDateString()

  const [todayEvents, pendingTasks, anthropicRows] = await Promise.all([
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
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "anthropic")))
      .limit(1),
  ])

  const hasAnthropicToken = anthropicRows.length > 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-muted-foreground text-sm">Your unified view</p>
      </div>

      <CoachPanel hasAnthropicToken={hasAnthropicToken} />

      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </div>
  )
}
