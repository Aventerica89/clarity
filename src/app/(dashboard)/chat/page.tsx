"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Plus, Trash2, Send, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatContainer } from "@/components/prompt-kit/chat-container"
import { Message, MessageAvatar, MessageContent } from "@/components/prompt-kit/message"
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/prompt-kit/prompt-input"
import { PromptSuggestion, PromptSuggestionGroup } from "@/components/prompt-kit/prompt-suggestion"
import { Loader } from "@/components/prompt-kit/loader"
import { cn } from "@/lib/utils"

interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "What should I focus on right now?",
  "Help me plan my day",
  "What's most urgent on my list?",
  "Review my routines with me",
]

function groupSessionsByDate(sessions: ChatSession[]) {
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()
  const lastWeek = new Date(now.getTime() - 7 * 86400000)

  const groups: { label: string; items: ChatSession[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Last 7 days", items: [] },
    { label: "Older", items: [] },
  ]

  for (const s of sessions) {
    const d = new Date(s.updatedAt)
    const ds = d.toDateString()
    if (ds === today) groups[0].items.push(s)
    else if (ds === yesterday) groups[1].items.push(s)
    else if (d >= lastWeek) groups[2].items.push(s)
    else groups[3].items.push(s)
  }

  return groups.filter((g) => g.items.length > 0)
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  )
}

function ChatPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const didAutoSend = useRef(false)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  // Load sessions on mount
  useEffect(() => {
    fetch("/api/chat/sessions")
      .then((r) => r.ok ? r.json() : { sessions: [] })
      .then((data: { sessions: ChatSession[] }) => setSessions(data.sessions))
      .catch(() => {})
  }, [])

  // Auto-send from ?q= query param (e.g. from Today page CTA)
  useEffect(() => {
    const q = searchParams.get("q")
    if (q && !didAutoSend.current) {
      didAutoSend.current = true
      router.replace("/chat", { scroll: false })
      sendMessage(q)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function createNewSession() {
    abortRef.current?.abort()
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New conversation" }),
    })
    if (!res.ok) return
    const data = await res.json() as { session: ChatSession }
    setSessions((prev) => [data.session, ...prev])
    setActiveSessionId(data.session.id)
    setMessages([])
    setError(null)
    setInput("")
  }

  async function loadSession(id: string) {
    if (id === activeSessionId) return
    abortRef.current?.abort()
    setActiveSessionId(id)
    setMessages([])
    setError(null)
    setIsLoadingMessages(true)
    try {
      const res = await fetch(`/api/chat/sessions/${id}`)
      if (!res.ok) return
      const data = await res.json() as { messages: ChatMessage[] }
      setMessages(data.messages)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  async function deleteSession(id: string) {
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" })
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSessionId === id) {
      setActiveSessionId(null)
      setMessages([])
    }
  }

  async function sendMessage(overrideQuestion?: string | unknown) {
    const question = (typeof overrideQuestion === "string" ? overrideQuestion : input).trim()
    if (!question || isStreaming) return

    // If no session, create one first
    let sessionId = activeSessionId
    if (!sessionId) {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New conversation" }),
      })
      if (!res.ok) return
      const data = await res.json() as { session: ChatSession }
      setSessions((prev) => [data.session, ...prev])
      sessionId = data.session.id
      setActiveSessionId(sessionId)
    }

    setInput("")
    setError(null)

    setMessages((prev) => [
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
        body: JSON.stringify({
          question,
          sessionId,
          namedSession: true,
          provider: "auto",
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setMessages((prev) => prev.slice(0, -2))
        setError(data.error ?? "Something went wrong.")
        setIsStreaming(false)
        return
      }

      // Update session title from auto-title (first message) — reload sessions list
      const isFirstMessage = messages.length === 0
      if (isFirstMessage) {
        // Wait a tick then reload sessions to pick up auto-title
        setTimeout(() => {
          fetch("/api/chat/sessions")
            .then((r) => r.ok ? r.json() : { sessions: [] })
            .then((d: { sessions: ChatSession[] }) => setSessions(d.sessions))
            .catch(() => {})
        }, 500)
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setMessages((prev) => prev.slice(0, -2))
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
          setMessages((prev) => {
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
        setMessages((prev) => prev.slice(0, -2))
        setError("Failed to reach coach. Check your connection.")
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const groups = groupSessionsByDate(sessions)
  const hasMessages = messages.length > 0

  return (
    <div className="flex h-full -m-4 md:-m-6 overflow-hidden">
      {/* Sessions sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r shrink-0">
        <div className="flex items-center justify-between px-3 py-3 border-b">
          <span className="text-sm font-medium">Conversations</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={createNewSession}
            title="New conversation"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-1">
          {sessions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No conversations yet</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </p>
                {group.items.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "group flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer",
                      s.id === activeSessionId
                        ? "bg-clarity-amber/10 text-foreground"
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => loadSession(s.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate text-xs">{s.title}</span>
                    </div>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(s.id)
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* No session selected / empty state */}
        {!activeSessionId && !hasMessages ? (
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-6 p-6 text-center">
              <Image
                src="/pwa/manifest-icon-192.maskable.png"
                alt="Clarity"
                width={64}
                height={64}
                className="rounded-2xl"
              />
              <div>
                <h1 className="text-2xl font-bold">Clarity Coach</h1>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Ask anything about your day, priorities, routines, or goals.
                </p>
              </div>
              <PromptSuggestionGroup>
                {SUGGESTIONS.map((s) => (
                  <PromptSuggestion key={s} onClick={() => { setInput(s) }}>
                    {s}
                  </PromptSuggestion>
                ))}
              </PromptSuggestionGroup>
            </div>
            <div className="shrink-0 px-4 pb-4 w-full max-w-2xl mx-auto">
              <PromptInput
                value={input}
                onValueChange={setInput}
                onSubmit={sendMessage}
                isLoading={isStreaming}
              >
                <PromptInputTextarea placeholder="Ask anything..." />
                <PromptInputActions>
                  <PromptInputAction
                    tooltip="Send"
                    onClick={sendMessage}
                    disabled={!input.trim() || isStreaming}
                  >
                    {isStreaming
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />}
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
              {isLoadingMessages ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading...
                </div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start gap-3")}>
                      {msg.role === "assistant" && (
                        <Image
                          src="/pwa/manifest-icon-192.maskable.png"
                          alt="Clarity"
                          width={28}
                          height={28}
                          className="h-7 w-7 shrink-0 rounded-full mt-0.5"
                        />
                      )}
                      <MessageContent role={msg.role} markdown={msg.role === "assistant"}>
                        {msg.content || (
                          isStreaming && i === messages.length - 1
                            ? <Loader variant="typing" />
                            : ""
                        )}
                        {msg.role === "assistant" && msg.content && isStreaming && i === messages.length - 1 && (
                          <Loader variant="pulse" />
                        )}
                      </MessageContent>
                    </div>
                  ))}
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t px-4 md:px-6 py-3">
              <div className="mx-auto max-w-2xl">
                <PromptInput
                  value={input}
                  onValueChange={setInput}
                  onSubmit={sendMessage}
                  isLoading={isStreaming}
                >
                  <PromptInputTextarea placeholder="Ask anything..." />
                  <PromptInputActions>
                    <PromptInputAction
                      tooltip="Send"
                      onClick={sendMessage}
                      disabled={!input.trim() || isStreaming}
                    >
                      {isStreaming
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />}
                    </PromptInputAction>
                  </PromptInputActions>
                </PromptInput>
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
