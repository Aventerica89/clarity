"use client"

import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface SectionDef {
  id: string
  label: string
}

interface TodaySectionNavProps {
  sections: readonly SectionDef[]
  activeId: string
  onSelect: (id: string) => void
}

export function TodaySectionNav({
  sections,
  activeId,
  onSelect,
}: TodaySectionNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll active pill into horizontal center
  const scrollActiveIntoView = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const pill = container.querySelector<HTMLElement>(
      `[data-section="${activeId}"]`,
    )
    if (!pill) return

    const left =
      pill.offsetLeft - container.offsetWidth / 2 + pill.offsetWidth / 2
    container.scrollTo({ left, behavior: "smooth" })
  }, [activeId])

  useEffect(() => {
    scrollActiveIntoView()
  }, [scrollActiveIntoView])

  return (
    <div
      className={cn(
        "md:hidden sticky top-0 z-30 -mx-4 px-4 py-2",
        "bg-background/80 backdrop-blur-sm",
        "border-b border-border/50",
      )}
    >
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-none"
      >
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            data-section={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              activeId === s.id
                ? "bg-clarity-amber-muted text-clarity-amber"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
