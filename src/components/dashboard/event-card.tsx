import { Clock, MapPin } from "lucide-react"

interface EventItem {
  id: string
  title: string
  startAt: Date
  endAt: Date
  isAllDay: boolean
  location: string | null
  calendarName: string | null
}

interface EventCardProps {
  event: EventItem
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function EventCard({ event }: EventCardProps) {
  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <div className="flex-shrink-0 w-1 bg-muted-foreground/25 rounded-full" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.title}</p>
        <div className="flex items-center gap-3 mt-1">
          {!event.isAllDay && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTime(event.startAt)} – {formatTime(event.endAt)}
            </span>
          )}
          {event.isAllDay && (
            <span className="text-xs text-muted-foreground">All day</span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
