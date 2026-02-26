"use client"

import { useEffect, useState } from "react"

/**
 * Tracks which section is currently visible in the scroll container.
 * Uses IntersectionObserver rooted on the [data-scroll] main element.
 */
export function useActiveSection(sectionIds: readonly string[]): string {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "")

  useEffect(() => {
    const root = document.querySelector("[data-scroll]")
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Build a map of currently intersecting sections
        const visible: Record<string, IntersectionObserverEntry> = {}
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible[entry.target.id] = entry
          }
        }

        // Pick the first section in document order that is visible
        for (const id of sectionIds) {
          if (visible[id]) {
            setActiveId(id)
            return
          }
        }
      },
      {
        root,
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      },
    )

    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [sectionIds])

  return activeId
}
