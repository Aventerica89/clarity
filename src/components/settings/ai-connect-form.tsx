"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  provider: "anthropic" | "gemini"
  connected: boolean
  placeholder: string
  label: string
}

export function AIConnectForm({ provider, connected, placeholder, label }: Props) {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const trimmed = token.trim()
    if (!trimmed) return
    startTransition(async () => {
      const res = await fetch(`/api/integrations/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      })
      if (res.ok) {
        setToken("")
        setMessage(null)
        router.refresh()
      } else {
        setMessage("Failed to save. Check the token and try again.")
      }
    })
  }

  function handleDisconnect() {
    startTransition(async () => {
      const res = await fetch(`/api/integrations/${provider}`, { method: "DELETE" })
      if (res.ok) {
        setMessage(null)
        router.refresh()
      } else {
        setMessage("Failed to disconnect.")
      }
    })
  }

  if (connected) {
    return (
      <div className="space-y-2">
        {message && <p className="text-xs text-red-500">{message}</p>}
        <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={isPending}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${provider}-token`} className="text-sm">{label}</Label>
      <div className="flex gap-2">
        <Input
          id={`${provider}-token`}
          type="password"
          placeholder={placeholder}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSave} disabled={isPending || !token.trim()}>
          Save
        </Button>
      </div>
      {message && <p className="text-xs text-red-500">{message}</p>}
    </div>
  )
}
