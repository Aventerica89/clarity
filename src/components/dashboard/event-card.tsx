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
    <div className="flex gap-3 py-3 border-b last:border-b-0 items-start">
      <div className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mt-1.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{event.title}</p>
        <div className="flex items-center gap-3 mt-1">
          {!event.isAllDay && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <Clock className="size-3" />
              {formatTime(event.startAt)} – {formatTime(event.endAt)}
            </span>
          )}
          {event.isAllDay && (
            <span className="text-xs text-muted-foreground">All day</span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <MapPin className="size-3 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
