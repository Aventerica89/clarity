"use client"

import { useState, useEffect } from "react"
import { Smartphone } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { getOnboardingStorageKey } from "@/components/onboarding/install-guide"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

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
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Install Guide</CardTitle>
          </div>
          <button
            onClick={reset}
            className="text-xs font-medium text-clarity-amber hover:opacity-80 transition-opacity"
          >
            Show again
          </button>
        </div>
        <CardDescription>
          Re-enable the iPhone install walkthrough on next login.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
