"use client"

import { CalendarX } from "lucide-react"
import { EventCard } from "@/components/dashboard/event-card"

interface SerializedEvent {
  id: string
  title: string
  startAt: string
  endAt: string
  isAllDay: boolean
  location: string | null
  calendarName: string | null
}

interface CalendarEventListProps {
  events: SerializedEvent[]
}

const TIMEZONE = "America/Phoenix"

function dateLabel(iso: string): string {
  const eventDate = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(iso))
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(tomorrow)

  if (eventDate === today) return "Today"
  if (eventDate === tomorrowStr) return "Tomorrow"

  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: TIMEZONE,
  })
}

export function CalendarEventList({ events }: CalendarEventListProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarX className="size-10 text-muted-foreground/40 mb-3" />
        <p className="font-medium">No upcoming events</p>
        <p className="text-sm text-muted-foreground">
          Events from your connected calendars will appear here.
        </p>
      </div>
    )
  }

  const grouped = new Map<string, SerializedEvent[]>()
  for (const event of events) {
    const label = dateLabel(event.startAt)
    const existing = grouped.get(label) ?? []
    grouped.set(label, [...existing, event])
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([label, groupEvents]) => (
        <div key={label}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">{label}</h2>
          <div className="rounded-lg border bg-card px-4">
            {groupEvents.map((event) => (
              <EventCard
                key={event.id}
                event={{
                  ...event,
                  startAt: new Date(event.startAt),
                  endAt: new Date(event.endAt),
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
