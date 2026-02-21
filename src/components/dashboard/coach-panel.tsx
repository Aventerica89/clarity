"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Loader2, Plus, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ProviderId = "anthropic" | "gemini" | "deepseek" | "groq"
type SelectedProvider = "auto" | ProviderId

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface HistoryMessage extends ChatMessage {
  id: string
  sessionId: string
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<SelectedProvider>("auto")
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasAny = connectedProviders.length > 0

  // Load history on mount
  useEffect(() => {
    if (!hasAny) {
      setIsLoadingHistory(false)
      return
    }
    fetch("/api/ai/coach")
      .then(r => r.ok ? r.json() : { messages: [] })
      .then((data: { messages: HistoryMessage[] }) => {
        if (data.messages.length > 0) {
          setMessages(data.messages.map(m => ({ role: m.role, content: m.content })))
          const lastMsg = data.messages[data.messages.length - 1]
          if (lastMsg) setSessionId(lastMsg.sessionId)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false))
  }, [hasAny])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  function handleTextareaInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }

  function startNewChat() {
    abortRef.current?.abort()
    setMessages([])
    setSessionId(null)
    setError(null)
    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  async function sendMessage() {
    if (!input.trim() || isStreaming) return
    const question = input.trim()
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setError(null)

    // Optimistically add user message and empty assistant placeholder
    setMessages(prev => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ])
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, provider: selectedProvider, sessionId }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setMessages(prev => prev.slice(0, -2))
        setError(data.error ?? "Something went wrong.")
        setIsStreaming(false)
        return
      }

      const newSessionId = res.headers.get("X-Session-Id")
      if (newSessionId) setSessionId(newSessionId)

      const reader = res.body?.getReader()
      if (!reader) {
        setMessages(prev => prev.slice(0, -2))
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
          const chunk = decoder.decode(result.value, { stream: !done })
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.role === "assistant") {
              return [...updated.slice(0, -1), { role: "assistant", content: last.content + chunk }]
            }
            return updated
          })
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages(prev => prev.slice(0, -2))
        setError("Failed to reach coach. Check your connection.")
      }
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
            Clarity
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <ProviderPill
              label="Auto"
              selected={selectedProvider === "auto"}
              onClick={() => setSelectedProvider("auto")}
            />
            {connectedProviders.map(pid => (
              <ProviderPill
                key={pid}
                label={PROVIDER_LABELS[pid]}
                selected={selectedProvider === pid}
                onClick={() => setSelectedProvider(pid)}
              />
            ))}
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={startNewChat}
                title="New chat"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
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
            {/* Message thread */}
            {(messages.length > 0 || isLoadingHistory) && (
              <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-2 py-1">
                {isLoadingHistory ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading history...
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        {msg.content}
                        {msg.role === "assistant" && isStreaming && i === messages.length - 1 && (
                          <span className="inline-block w-1.5 h-3.5 bg-foreground/70 ml-0.5 animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Input row */}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                placeholder="Ask anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onInput={handleTextareaInput}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={isStreaming}
                rows={1}
                className="flex-1 resize-none overflow-hidden min-h-[36px] max-h-40"
              />
              <Button
                onClick={sendMessage}
                disabled={isStreaming || !input.trim()}
                size="sm"
                className="shrink-0 h-9 w-9 p-0"
              >
                {isStreaming
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Send className="h-3.5 w-3.5" />
                }
              </Button>
            </div>
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
