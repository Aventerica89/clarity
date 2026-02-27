import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { events, financialSnapshot, lifeContextItems, tasks } from "@/lib/schema"
import { EventCard } from "@/components/dashboard/event-card"
import { TaskList } from "@/components/dashboard/task-list"
import { CoachPanel } from "@/components/dashboard/coach-panel"
import { LifeContextStrip } from "@/components/dashboard/life-context-strip"
import { LiveClock } from "@/components/dashboard/live-clock"
import { TodayMobileShell } from "@/components/dashboard/today-mobile-shell"
import { DayPlanV3 } from "@/components/dashboard/day-plan"
import { WidgetSidebar } from "@/components/dashboard/widgets/widget-sidebar"
import { WeatherWidget } from "@/components/dashboard/widgets/weather-widget"
import { FinanceWidget } from "@/components/dashboard/widgets/finance-widget"
import { RunwayWidget } from "@/components/dashboard/widgets/runway-widget"
import { StreaksWidget } from "@/components/dashboard/widgets/streaks-widget"
import { TriageWidget } from "@/components/dashboard/widgets/triage-widget"
import { WeekWidget } from "@/components/dashboard/widgets/week-widget"

const TIMEZONE = "America/Phoenix"

function todayRange() {
  const nowStr = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
  const start = new Date(`${nowStr}T00:00:00`)
  const end = new Date(`${nowStr}T23:59:59.999`)
  const offsetMs = 7 * 60 * 60 * 1000
  return { start: new Date(start.getTime() + offsetMs), end: new Date(end.getTime() + offsetMs) }
}

function todayDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
}

const WIDGETS = [
  { id: "weather", component: <WeatherWidget /> },
  { id: "finance", component: <FinanceWidget /> },
  { id: "runway", component: <RunwayWidget /> },
  { id: "streaks", component: <StreaksWidget /> },
  { id: "triage", component: <TriageWidget /> },
  { id: "week", component: <WeekWidget /> },
]

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
            eq(tasks.isHidden, false),
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
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <LiveClock />
      </div>

      <TodayMobileShell
        coachSlot={<CoachPanel />}
        planSlot={<DayPlanV3 />}
        widgetsSlot={<WidgetSidebar widgets={WIDGETS} />}
        contextSlot={
          <LifeContextStrip
            items={lifeContextRows}
            snapshot={financialRows[0] ?? null}
          />
        }
        tasksSlot={
          pendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending tasks. Connect Todoist in Settings to sync.
            </p>
          ) : (
            <TaskList
              tasks={pendingTasks.map((t) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                source: t.source,
                sourceId: t.sourceId,
                dueDate: t.dueDate,
                priorityManual: t.priorityManual,
                labels: t.labels,
              }))}
            />
          )
        }
        eventsSlot={
          todayEvents.length === 0 ? (
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
          )
        }
        taskCount={pendingTasks.length}
        eventCount={todayEvents.length}
      />
    </div>
  )
}
