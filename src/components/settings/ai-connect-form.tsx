"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TestResult {
  ok: boolean
  tokenType?: string
  prefix?: string
  apiCall?: string
  reply?: string
  stage?: string
  error?: string
}

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
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
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
        setTestResult(null)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setMessage(data.error ?? "Failed to save. Check the token and try again.")
      }
    })
  }

  function handleDisconnect() {
    startTransition(async () => {
      const res = await fetch(`/api/integrations/${provider}`, { method: "DELETE" })
      if (res.ok) {
        setMessage(null)
        setTestResult(null)
        router.refresh()
      } else {
        setMessage("Failed to disconnect.")
      }
    })
  }

  async function handleTest() {
    if (provider !== "anthropic") return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/integrations/anthropic/test`)
      const data = await res.json() as TestResult
      setTestResult(data)
    } catch {
      setTestResult({ ok: false, error: "Could not reach test endpoint" })
    } finally {
      setTesting(false)
    }
  }

  if (connected) {
    return (
      <div className="space-y-3">
        {message && <p className="text-xs text-red-500">{message}</p>}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={isPending || testing}>
            Disconnect
          </Button>
          {provider === "anthropic" && (
            <Button variant="outline" size="sm" onClick={handleTest} disabled={isPending || testing}>
              {testing ? "Testing..." : "Test connection"}
            </Button>
          )}
        </div>
        {testResult && (
          <div className={`rounded-md p-3 text-xs space-y-1 ${testResult.ok ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"}`}>
            {testResult.ok ? (
              <>
                <p className="font-medium">Connection OK</p>
                <p>Type: {testResult.tokenType} · Prefix: <code className="font-mono">{testResult.prefix}</code></p>
                <p>Reply: {testResult.reply}</p>
              </>
            ) : (
              <>
                <p className="font-medium">Connection failed{testResult.stage ? ` (${testResult.stage})` : ""}</p>
                {testResult.tokenType && (
                  <p>Type: {testResult.tokenType} · Prefix: <code className="font-mono">{testResult.prefix}</code></p>
                )}
                <p>{testResult.error}</p>
              </>
            )}
          </div>
        )}
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
