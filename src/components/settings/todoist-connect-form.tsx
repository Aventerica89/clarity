"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  connected: boolean
  displayName?: string | null
  connectionMethod?: string | null
}

export function TodoistConnectForm({ connected, displayName, connectionMethod }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Handle OAuth redirect feedback via search params
  useEffect(() => {
    const todoistParam = searchParams.get("todoist")
    if (todoistParam === "connected") {
      setMessage("Todoist connected successfully.")
    } else if (todoistParam === "cancelled") {
      setMessage("Connection cancelled.")
    } else if (todoistParam === "error") {
      setMessage("Connection failed. Please try again.")
    }
  }, [searchParams])

  function handleOAuthConnect() {
    window.location.href = "/api/auth/todoist"
  }

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
        {displayName && (
          <p className="text-sm text-muted-foreground">
            Connected as <span className="font-medium text-foreground">{displayName}</span>
            {connectionMethod === "token" && " (API token)"}
          </p>
        )}
        {message && (
          <p className="text-xs text-muted-foreground">{message}</p>
        )}
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
    <div className="space-y-3">
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      <Button size="sm" onClick={handleOAuthConnect} disabled={isPending} className="gap-2">
        <Image src="/logos/todoist-icon.svg" alt="" width={16} height={16} />
        Connect to Todoist
      </Button>
      <div className="relative flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex-1 border-t" />
        <span>or use API token</span>
        <span className="flex-1 border-t" />
      </div>
      <div className="space-y-1">
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
      </div>
    </div>
  )
}
