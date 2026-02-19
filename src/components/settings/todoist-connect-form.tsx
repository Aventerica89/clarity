"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  connected: boolean
}

export function TodoistConnectForm({ connected }: Props) {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const trimmed = token.trim()
    if (!trimmed) return
    startTransition(async () => {
      const res = await fetch("/api/integrations/todoist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      })
      if (res.ok) {
        setToken("")
        router.refresh()
      } else {
        setMessage("Failed to save token.")
      }
    })
  }

  function handleDisconnect() {
    startTransition(async () => {
      const res = await fetch("/api/integrations/todoist", { method: "DELETE" })
      if (res.ok) {
        router.refresh()
      } else {
        setMessage("Failed to disconnect.")
      }
    })
  }

  if (connected) {
    return (
      <div className="space-y-2">
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isPending}
        >
          Disconnect Todoist
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="todoist-token" className="text-sm">
        API Token
      </Label>
      <div className="flex gap-2">
        <Input
          id="todoist-token"
          type="password"
          placeholder="Paste your Todoist API token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSave} disabled={isPending || !token.trim()}>
          Save
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}
