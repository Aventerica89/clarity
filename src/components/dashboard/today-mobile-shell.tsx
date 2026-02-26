"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useActiveSection } from "@/lib/use-active-section"
import { TodaySectionNav } from "@/components/dashboard/today-section-nav"
import { CollapsibleSection } from "@/components/dashboard/collapsible-section"

const SECTIONS = [
  { id: "coach", label: "Coach" },
  { id: "plan", label: "Plan" },
  { id: "widgets", label: "Widgets" },
  { id: "context", label: "Context" },
  { id: "tasks", label: "Tasks" },
  { id: "events", label: "Events" },
] as const

const SECTION_IDS = SECTIONS.map((s) => s.id)

interface TodayMobileShellProps {
  coachSlot: React.ReactNode
  planSlot: React.ReactNode
  widgetsSlot: React.ReactNode
  contextSlot: React.ReactNode
  tasksSlot: React.ReactNode
  eventsSlot: React.ReactNode
  taskCount?: number
  eventCount?: number
}

export function TodayMobileShell({
  coachSlot,
  planSlot,
  widgetsSlot,
  contextSlot,
  tasksSlot,
  eventsSlot,
  taskCount,
  eventCount,
}: TodayMobileShellProps) {
  // All sections start expanded
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const activeId = useActiveSection(SECTION_IDS)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Toggle a section's collapsed state
  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // Hash navigation on mount — expand + scroll to hash target
  useEffect(() => {
    const hash = window.location.hash.replace("#", "")
    if (!hash || !SECTION_IDS.includes(hash as (typeof SECTION_IDS)[number])) return

    // Ensure it's expanded
    setCollapsed((prev) => ({ ...prev, [hash]: false }))

    // Scroll after a tick to let React render
    requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      el?.scrollIntoView({ behavior: "smooth" })
    })
  }, [])

  // Passive hash update on scroll (replaceState to avoid polluting history)
  useEffect(() => {
    if (!activeId) return

    // Debounce so we don't fire replaceState on every observer callback
    clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      const current = window.location.hash.replace("#", "")
      if (current !== activeId) {
        window.history.replaceState(null, "", `#${activeId}`)
      }
    }, 150)

    return () => clearTimeout(scrollTimerRef.current)
  }, [activeId])

  // Pill tap: expand section + scroll to it + update hash
  const handlePillSelect = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: false }))
    window.history.replaceState(null, "", `#${id}`)

    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      el?.scrollIntoView({ behavior: "smooth" })
    })
  }, [])

  // Badge counts per section
  const badgeFor = useCallback(
    (id: string): number | undefined => {
      if (id === "tasks") return taskCount
      if (id === "events") return eventCount
      return undefined
    },
    [taskCount, eventCount],
  )

  // Map section id -> slot content
  const slotMap = useMemo<Record<string, React.ReactNode>>(
    () => ({
      coach: coachSlot,
      plan: planSlot,
      widgets: widgetsSlot,
      context: contextSlot,
      tasks: tasksSlot,
      events: eventsSlot,
    }),
    [coachSlot, planSlot, widgetsSlot, contextSlot, tasksSlot, eventsSlot],
  )

  return (
    <>
      <TodaySectionNav
        sections={SECTIONS}
        activeId={activeId}
        onSelect={handlePillSelect}
      />

      <div className="space-y-6">
        {/* Coach */}
        <CollapsibleSection
          id="coach"
          title="Coach"
          open={!collapsed.coach}
          onToggle={() => toggle("coach")}
        >
          {slotMap.coach}
        </CollapsibleSection>

        {/* Plan + Widgets: side-by-side on desktop */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
          <CollapsibleSection
            id="plan"
            title="Plan"
            open={!collapsed.plan}
            onToggle={() => toggle("plan")}
          >
            {slotMap.plan}
          </CollapsibleSection>

          <CollapsibleSection
            id="widgets"
            title="Widgets"
            open={!collapsed.widgets}
            onToggle={() => toggle("widgets")}
          >
            {slotMap.widgets}
          </CollapsibleSection>
        </div>

        {/* Life Context */}
        <CollapsibleSection
          id="context"
          title="Context"
          open={!collapsed.context}
          onToggle={() => toggle("context")}
        >
          {slotMap.context}
        </CollapsibleSection>

        {/* Tasks + Events: 3fr/2fr on desktop */}
        <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
          <CollapsibleSection
            id="tasks"
            title="Tasks"
            badge={badgeFor("tasks")}
            open={!collapsed.tasks}
            onToggle={() => toggle("tasks")}
          >
            {slotMap.tasks}
          </CollapsibleSection>

          <CollapsibleSection
            id="events"
            title="Events"
            badge={badgeFor("events")}
            open={!collapsed.events}
            onToggle={() => toggle("events")}
          >
            {slotMap.events}
          </CollapsibleSection>
        </div>
      </div>
    </>
  )
}
