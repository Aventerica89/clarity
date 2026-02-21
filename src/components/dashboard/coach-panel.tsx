"use client"

import { useState, useRef } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ProviderId = "anthropic" | "gemini" | "deepseek" | "groq"
type SelectedProvider = "auto" | ProviderId

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Claude",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  groq: "Groq",
}

interface Props {
  connectedProviders: ProviderId[]
}

export function CoachPanel({ connectedProviders }: Props) {
  const [response, setResponse] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customQuestion, setCustomQuestion] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<SelectedProvider>("auto")
  const abortRef = useRef<AbortController | null>(null)

  const hasAny = connectedProviders.length > 0

  async function askCoach(question?: string) {
    if (isStreaming) {
      abortRef.current?.abort()
      return
    }

    setError(null)
    setResponse("")
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question ?? "What should I do right now?",
          provider: selectedProvider,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? "Something went wrong.")
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setError("No response stream.")
        setIsStreaming(false)
        return
      }

      const decoder = new TextDecoder()
      let done = false
      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          setResponse((prev) => (prev ?? "") + decoder.decode(result.value, { stream: !done }))
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Failed to reach coach. Check your connection.")
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          What should I do right now?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAny ? (
          <p className="text-sm text-muted-foreground">
            Add an AI API key in{" "}
            <a href="/settings" className="underline underline-offset-2">Settings</a>{" "}
            to enable the AI coach.
          </p>
        ) : (
          <>
            {/* Provider selector */}
            <div className="flex items-center gap-1 flex-wrap">
              <ProviderPill
                label="Auto"
                selected={selectedProvider === "auto"}
                onClick={() => setSelectedProvider("auto")}
              />
              {connectedProviders.map((pid) => (
                <ProviderPill
                  key={pid}
                  label={PROVIDER_LABELS[pid]}
                  selected={selectedProvider === pid}
                  onClick={() => setSelectedProvider(pid)}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Ask something specific... or leave blank"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isStreaming) {
                    askCoach(customQuestion || undefined)
                  }
                }}
                disabled={isStreaming}
                className="flex-1"
              />
              <Button
                onClick={() => askCoach(customQuestion || undefined)}
                variant={isStreaming ? "outline" : "default"}
                size="sm"
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Stop
                  </>
                ) : (
                  "Ask"
                )}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {response !== null && (
              <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {response}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-foreground/70 ml-0.5 animate-pulse" />
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ProviderPill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-6 rounded-full px-2.5 text-xs font-medium transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
      )}
    >
      {label}
    </button>
  )
}
