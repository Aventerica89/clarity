"use client"

import { useState, useEffect } from "react"
import { Smartphone } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { getOnboardingStorageKey } from "@/components/onboarding/install-guide"

export function OnboardingReset() {
  const { data: session } = useSession()
  const [dismissed, setDismissed] = useState(false)

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    const key = getOnboardingStorageKey(userId)
    setDismissed(Boolean(localStorage.getItem(key)))
  }, [userId])

  function reset() {
    if (!userId) return
    localStorage.removeItem(getOnboardingStorageKey(userId))
    setDismissed(false)
  }

  if (!dismissed) return null

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <Smartphone className="size-4 text-muted-foreground shrink-0" />
        <div className="text-left">
          <p className="text-sm font-medium">Install Guide</p>
          <p className="text-xs text-muted-foreground">Re-enable the iPhone install walkthrough on next login.</p>
        </div>
      </div>
      <button
        onClick={reset}
        className="text-xs font-medium text-clarity-amber hover:opacity-80 transition-opacity shrink-0"
      >
        Show again
      </button>
    </div>
  )
}
