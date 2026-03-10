import {
  Mail,
  Calendar,
  CheckSquare,
  ListTodo,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SOURCE_ICONS: Record<string, React.ElementType> = {
  gmail: Mail,
  google_calendar: Calendar,
  todoist: CheckSquare,
  google_tasks: ListTodo,
}

const SOURCE_LABELS: Record<string, string> = {
  gmail: "Gmail",
  google_calendar: "Calendar",
  todoist: "Todoist",
  google_tasks: "Google Tasks",
}

const SOURCE_COLORS: Record<string, string> = {
  todoist: "text-[#E44332]",
  gmail: "text-[#4285F4]",
  google_calendar: "text-[#4285F4]",
  google_tasks: "text-[#4285F4]",
}

interface SourceBadgeProps {
  source: string
  className?: string
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const Icon = SOURCE_ICONS[source] ?? Mail
  const color = SOURCE_COLORS[source] ?? "text-muted-foreground"
  const label = SOURCE_LABELS[source] ?? source

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5",
        className
      )}
    >
      <Icon className={cn("size-3", color)} />
      <span className="text-xs text-foreground">{label}</span>
    </span>
  )
}

export { SOURCE_LABELS, SOURCE_ICONS, SOURCE_COLORS }
