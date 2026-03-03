"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Props {
  connected: boolean
}

export function OpenWeatherMapConnectForm({ connected }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const trimmed = token.trim()
    if (!trimmed) return
    startTransition(async () => {
      const res = await fetch("/api/integrations/openweathermap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      })
      if (res.ok) {
        setToken("")
        setExpanded(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? "Failed to save. Check your key and try again.")
      }
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const res = await fetch("/api/integrations/openweathermap", { method: "DELETE" })
      if (res.ok) {
        router.refresh()
      } else {
        setError("Failed to disconnect.")
      }
    })
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-3.5 text-green-500 dark:text-green-400" />
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Connected</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-destructive ml-1"
          onClick={handleRemove}
          disabled={isPending}
        >
          Remove
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {!expanded ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => { setExpanded(true); setError(null) }}
          disabled={isPending}
        >
          Connect
        </Button>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="h-8 text-sm max-w-xs"
              autoFocus
            />
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleSave}
              disabled={isPending || !token.trim()}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setExpanded(false); setToken(""); setError(null) }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <a
            href="https://home.openweathermap.org/api_keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Get API key
            <ExternalLink className="size-3" />
          </a>
        </>
      )}
    </div>
  )
}
