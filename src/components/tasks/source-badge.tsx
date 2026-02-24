import { Badge } from "@/components/ui/badge"
import {
  SOURCE_ICONS,
  SOURCE_LABELS,
  SOURCE_COLORS,
  type TaskSource,
} from "@/types/task"
import { cn } from "@/lib/utils"

interface SourceBadgeProps {
  source: string
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const key = source as TaskSource
  const Icon = SOURCE_ICONS[key] ?? SOURCE_ICONS.manual
  const label = SOURCE_LABELS[key] ?? source
  const color = SOURCE_COLORS[key] ?? "text-muted-foreground"

  return (
    <Badge variant="outline" className="gap-1 text-xs font-normal px-1.5 py-0">
      <Icon className={cn("size-3", color)} />
      {label}
    </Badge>
  )
}
