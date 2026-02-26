"use client"

import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  id: string
  title: string
  badge?: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function CollapsibleSection({
  id,
  title,
  badge,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <section id={id} className="min-w-0 scroll-mt-14">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 py-1 md:pointer-events-none"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform md:hidden",
            open && "rotate-90",
          )}
        />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
          {badge != null && badge > 0 && (
            <span className="ml-1.5 normal-case">({badge})</span>
          )}
        </h2>
      </button>

      <div className={cn("mt-2", !open && "hidden md:block")}>
        {children}
      </div>
    </section>
  )
}
