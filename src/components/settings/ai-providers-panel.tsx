"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ProviderId = "anthropic" | "gemini" | "gemini-pro" | "deepseek" | "groq"

interface ProviderConfig {
  id: ProviderId
  label: string
  model: string
  description: string
  placeholder: string
  docsUrl: string
  avatarColor: string
  initial: string
  logoSrc?: string
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "anthropic",
    label: "Claude",
    model: "claude-sonnet-4-6",
    description: "Primary coach — best reasoning",
    placeholder: "sk-ant-api01-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    avatarColor: "bg-violet-500",
    initial: "A",
    logoSrc: "/logos/claude-logo.svg",
  },
  {
    id: "gemini",
    label: "Gemini Flash",
    model: "gemini-2.0-flash",
    description: "Google AI — free tier (AI Studio key)",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    avatarColor: "bg-blue-500",
    initial: "G",
    logoSrc: "/logos/google-logo.svg",
  },
  {
    id: "gemini-pro",
    label: "Gemini Pro",
    model: "gemini-3.1-pro-preview",
    description: "Google AI — paid (Gemini CLI / API key)",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    avatarColor: "bg-indigo-500",
    initial: "G+",
    logoSrc: "/logos/google-logo.svg",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    model: "deepseek-chat",
    description: "Ultra-low cost, great reasoning",
    placeholder: "sk-...",
    docsUrl: "https://platform.deepseek.com/api-keys",
    avatarColor: "bg-teal-500",
    initial: "D",
  },
  {
    id: "groq",
    label: "Groq",
    model: "llama-3.3-70b-versatile",
    description: "Free tier — fastest inference",
    placeholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    avatarColor: "bg-orange-500",
    initial: "Gr",
    logoSrc: "/logos/groq-logo.svg",
  },
]

interface Props {
  connected: Record<ProviderId, boolean>
}

export function AIProvidersPanel({ connected }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<ProviderId | null>(null)
  const [keys, setKeys] = useState<Partial<Record<ProviderId, string>>>({})
  const [errors, setErrors] = useState<Partial<Record<ProviderId, string>>>({})
  const [isPending, startTransition] = useTransition()

  function toggleExpand(id: ProviderId) {
    setExpanded(prev => (prev === id ? null : id))
    setErrors(prev => ({ ...prev, [id]: undefined }))
  }

  function handleSave(id: ProviderId) {
    const token = keys[id]?.trim()
    if (!token) return
    startTransition(async () => {
      const res = await fetch(`/api/integrations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        setKeys(prev => ({ ...prev, [id]: "" }))
        setExpanded(null)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setErrors(prev => ({ ...prev, [id]: data.error ?? "Failed to save. Check your key and try again." }))
      }
    })
  }

  function handleRemove(id: ProviderId) {
    startTransition(async () => {
      const res = await fetch(`/api/integrations/${id}`, { method: "DELETE" })
      if (res.ok) {
        router.refresh()
      } else {
        setErrors(prev => ({ ...prev, [id]: "Failed to disconnect." }))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Models</CardTitle>
        <CardDescription>
          Your coach uses the first connected provider. Add multiple as fallbacks.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {PROVIDERS.map((p, i) => {
            const isConnected = connected[p.id]
            const isExpanded = expanded === p.id
            const isLast = i === PROVIDERS.length - 1

            return (
              <div
                key={p.id}
                className={cn("px-6 py-4 transition-colors", isLast && "rounded-b-lg")}
              >
                <div className="flex items-center gap-3">
                  {p.logoSrc ? (
                    <img
                      src={p.logoSrc}
                      alt={p.label}
                      className="size-8 rounded-md object-contain shrink-0"
                    />
                  ) : (
                    <div
                      className={cn(
                        "size-8 rounded-md flex items-center justify-center",
                        "text-white text-xs font-bold shrink-0",
                        p.avatarColor
                      )}
                    >
                      {p.initial}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{p.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.model}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-3.5 text-green-500 dark:text-green-400" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Connected
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(p.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleExpand(p.id)}
                        disabled={isPending}
                      >
                        {isExpanded ? "Cancel" : "Connect"}
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && !isConnected && (
                  <div className="mt-3 pl-11 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={p.placeholder}
                        value={keys[p.id] ?? ""}
                        onChange={(e) => setKeys(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleSave(p.id)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleSave(p.id)}
                        disabled={isPending || !keys[p.id]?.trim()}
                      >
                        Save
                      </Button>
                    </div>
                    {errors[p.id] && (
                      <p className="text-xs text-destructive">{errors[p.id]}</p>
                    )}
                    <a
                      href={p.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Get API key
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                {errors[p.id] && isConnected && (
                  <p className="mt-2 pl-11 text-xs text-destructive">{errors[p.id]}</p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
