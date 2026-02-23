"use client"

import { useEffect, useState, useRef } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const reloading = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "dev"
    const swUrl = `/sw.js?v=${commitSha}`

    navigator.serviceWorker.register(swUrl).then((registration) => {
      // If there's already a waiting worker on load, show the banner.
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        return
      }

      // Detect new service worker installed and waiting to activate.
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener("statechange", () => {
          // Only show banner when there's a NEW version waiting and an
          // existing controller is active (not on first install).
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(newWorker)
          }
        })
      })
    })

    // When the new SW activates (after skipWaiting), reload once.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading.current) return
      reloading.current = true
      window.location.reload()
    })
  }, [])

  function handleUpdate() {
    if (!waitingWorker) return
    waitingWorker.postMessage("SKIP_WAITING")
  }

  if (!waitingWorker) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-clarity-amber px-4 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] text-clarity-amber-foreground shadow-md">
      <RefreshCw className="size-4 animate-spin" />
      <span className="text-sm font-medium">Clarity has been updated</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 rounded-full px-3 text-xs font-semibold"
        onClick={handleUpdate}
      >
        Update
      </Button>
    </div>
  )
}
