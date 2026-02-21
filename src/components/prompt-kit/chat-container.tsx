"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ChatContainerProps {
  children: React.ReactNode
  className?: string
}

export function ChatContainer({ children, className }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  // Track whether user is near the bottom
  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distanceFromBottom < 80
  }

  // Expose scrollToBottom so parent can call it via ref if needed
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll)
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      ref={scrollRef}
      data-chat-container
      className={cn("flex flex-col overflow-y-auto", className)}
    >
      {children}
    </div>
  )
}

// Hook for child components to scroll the container to bottom
export function useChatScroll() {
  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = document.querySelector("[data-chat-container]") as HTMLDivElement | null
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }
  return { scrollToBottom }
}
