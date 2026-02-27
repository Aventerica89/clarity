"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  CheckSquare,
  Layers,
  Loader2,
  Mail,
  X,
} from "lucide-react"
import type { ContextPin, PinnedItemType } from "@/types/life-context"
import { formatRelativeTime, formatTimestamp } from "@/types/life-context"

const PIN_TYPE_ICONS: Record<PinnedItemType, typeof CheckSquare> = {
  task: CheckSquare,
  email: Mail,
  event: CalendarDays,
  context: Layers,
}

const PIN_TYPE_LABELS: Record<PinnedItemType, string> = {
  task: "Task",
  email: "Email",
  event: "Event",
  context: "Context",
}

const PIN_LINK_DESTINATIONS: Record<PinnedItemType, (id: string) => string> = {
  task: () => "/tasks",
  email: () => "/email",
  event: () => "/calendar",
  context: (id) => `/life-context/${id}`,
}

export function PinTimelineEntry({
  itemId,
  pin,
  onUnpinned,
}: {
  itemId: string
  pin: ContextPin
  onUnpinned: (pinId: string) => void
}) {
  const [unpinning, setUnpinning] = useState(false)
  const Icon = PIN_TYPE_ICONS[pin.pinnedType]
  const linkTo = PIN_LINK_DESTINATIONS[pin.pinnedType](pin.pinnedId)

  async function handleUnpin() {
    setUnpinning(true)
    try {
      const res = await fetch(`/api/life-context/${itemId}/pins/${pin.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        onUnpinned(pin.id)
      }
    } finally {
      setUnpinning(false)
    }
  }

  return (
    <div className="group relative flex gap-4 pb-6 last:pb-0">
      <div className="relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-background bg-violet-500" />

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-500 ring-1 ring-inset ring-violet-500/20">
            <Icon className="size-3" />
            {PIN_TYPE_LABELS[pin.pinnedType]}
          </span>
          <Link
            href={linkTo}
            className="text-sm font-medium hover:underline truncate"
          >
            {pin.resolved.title}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(pin.createdAt)}
          </span>

          <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-0 max-md:opacity-100">
            <button
              type="button"
              onClick={handleUnpin}
              disabled={unpinning}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              title="Unpin"
            >
              {unpinning ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3" />
              )}
            </button>
          </div>
        </div>

        {pin.resolved.subtitle && (
          <p className="text-xs text-muted-foreground">{pin.resolved.subtitle}</p>
        )}
        {pin.note && (
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{pin.note}&rdquo;
          </p>
        )}
        {pin.direction === "incoming" && (
          <p className="text-[10px] text-muted-foreground/60">
            Linked from another context
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/60">
          {formatTimestamp(pin.createdAt)}
        </p>
      </div>
    </div>
  )
}
