import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, asc, eq, gte } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { events } from "@/lib/schema"
import { CalendarEventList } from "@/components/calendar/event-list"

export default async function CalendarPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const upcomingEvents = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, session.user.id), gte(events.startAt, startOfToday)))
    .orderBy(asc(events.startAt))
    .limit(50)

  const serialized = upcomingEvents.map((e) => ({
    id: e.id,
    title: e.title,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    isAllDay: e.isAllDay,
    location: e.location,
    calendarName: e.calendarName,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground text-sm">Upcoming events</p>
      </div>
      <CalendarEventList events={serialized} />
    </div>
  )
}
