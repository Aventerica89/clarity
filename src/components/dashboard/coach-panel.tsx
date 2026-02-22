"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

export function CoachPanel() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  function go() {
    const q = query.trim()
    if (!q) return
    router.push(`/chat?q=${encodeURIComponent(q)}`)
  }

  return (
    <div
      className="group relative flex items-center rounded-xl border bg-card px-4 py-3 transition-colors focus-within:border-clarity-amber/40 hover:border-border/80"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            go()
          }
        }}
        placeholder="Ask Clarity anything..."
        className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none"
      />
      <button
        type="button"
        onClick={go}
        disabled={!query.trim()}
        className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-clarity-amber/10 text-clarity-amber transition-opacity disabled:opacity-30"
        aria-label="Go to chat"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
