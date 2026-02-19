"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  provider: "google-calendar" | "todoist"
  label?: string
}

export function SyncButton({ provider, label = "Sync now" }: Props) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSync() {
    startTransition(async () => {
      setMessage(null)
      const res = await fetch(`/api/sync/${provider}`, { method: "POST" })
      const data = (await res.json()) as { synced?: number; error?: string }
      if (res.ok) {
        setMessage(`Synced ${data.synced ?? 0} items.`)
        router.refresh()
      } else {
        setMessage(data.error ?? "Sync failed.")
      }
    })
  }

  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isPending}
        className="gap-2"
      >
        <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
        {label}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}
