export type Severity = "monitoring" | "active" | "escalated" | "critical" | "resolved"

export const SEVERITY_LIST: Severity[] = ["monitoring", "active", "escalated", "critical", "resolved"]

export const SEVERITY_LABELS: Record<Severity, string> = {
  monitoring: "Monitoring",
  active: "Active",
  escalated: "Escalated",
  critical: "Critical",
  resolved: "Resolved",
}

export const SEVERITY_CLASSES: Record<Severity, string> = {
  monitoring: "bg-muted text-muted-foreground ring-border",
  active: "bg-clarity-amber/10 text-clarity-amber ring-clarity-amber/20",
  escalated: "bg-orange-500/10 text-orange-500 ring-orange-500/20",
  critical: "bg-destructive/10 text-destructive ring-destructive/20",
  resolved: "bg-green-500/10 text-green-500 ring-green-500/20",
}

export interface ContextItem {
  id: string
  title: string
  description: string
  urgency: Severity
  isActive: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface ContextUpdate {
  id: string
  contextItemId: string
  content: string
  severity: Severity
  source?: "user" | "ai"
  createdAt: string | Date
}

// ─── Context Pins ────────────────────────────────────────────────────────────

export type PinnedItemType = "task" | "email" | "event" | "context"

export interface ContextPin {
  id: string
  contextItemId: string
  pinnedType: PinnedItemType
  pinnedId: string
  note: string | null
  createdAt: string | Date
  direction: "outgoing" | "incoming"
  resolved: {
    title: string
    subtitle: string | null
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatTimestamp(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
