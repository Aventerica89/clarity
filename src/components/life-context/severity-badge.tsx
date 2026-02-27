import { cn } from "@/lib/utils"
import {
  type Severity,
  SEVERITY_LABELS,
  SEVERITY_CLASSES,
} from "@/types/life-context"

export function SeverityBadge({
  severity,
  size = "md",
}: {
  severity: Severity
  size?: "sm" | "md"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full ring-1 ring-inset font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        SEVERITY_CLASSES[severity],
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  )
}

const SEVERITY_DOT_COLORS: Record<Severity, string> = {
  monitoring: "bg-muted-foreground",
  active: "bg-clarity-amber",
  escalated: "bg-orange-500",
  critical: "bg-destructive",
  resolved: "bg-green-500",
}

export function severityDotColor(severity: Severity): string {
  return SEVERITY_DOT_COLORS[severity]
}
