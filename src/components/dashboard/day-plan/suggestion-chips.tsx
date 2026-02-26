"use client"

import { useRouter } from "next/navigation"
import { Zap, Calendar, DollarSign, AlertTriangle, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"

interface Chip {
  icon: React.ReactNode
  label: string
  query: string
}

const DEFAULT_CHIPS: Chip[] = [
  { icon: <Zap className="size-3.5" />, label: "What should I do right now?", query: "What should I do right now?" },
  { icon: <Calendar className="size-3.5" />, label: "Plan my tomorrow", query: "Help me plan tomorrow" },
  { icon: <DollarSign className="size-3.5" />, label: "Review spending", query: "Review this week's spending" },
  { icon: <AlertTriangle className="size-3.5" />, label: "Life context update", query: "Give me an update on my active life context items" },
  { icon: <Repeat className="size-3.5" />, label: "Routines behind?", query: "What routines am I behind on?" },
]

export function SuggestionChips() {
  const router = useRouter()

  function handleChipClick(query: string) {
    router.push(`/chat?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {DEFAULT_CHIPS.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => handleChipClick(chip.query)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5",
            "bg-muted/50 text-xs font-medium text-muted-foreground",
            "transition-colors hover:border-clarity-amber/40 hover:bg-muted hover:text-foreground",
          )}
        >
          {chip.icon}
          {chip.label}
        </button>
      ))}
    </div>
  )
}
