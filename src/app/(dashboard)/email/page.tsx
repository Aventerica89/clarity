"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Loader2, MailX, Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle"
import { EmailCard } from "@/components/email/email-card"

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
  isFavorited?: boolean
}

function getGridClass(viewMode: ViewMode): string {
  if (viewMode === "compact") return "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
  if (viewMode === "comfortable") return "grid grid-cols-1 lg:grid-cols-2 gap-4"
  return "space-y-3"
}

function filterMessages(messages: GmailMessage[], query: string): GmailMessage[] {
  if (!query.trim()) return messages
  const q = query.toLowerCase()
  return messages.filter(
    (m) =>
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q),
  )
}

export default function EmailPage() {
  const [recent, setRecent] = useState<GmailMessage[]>([])
  const [starred, setStarred] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("comfortable")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("email-view") as ViewMode | null
    if (saved) setViewMode(saved)
  }, [])

  function handleViewChange(v: ViewMode) {
    setViewMode(v)
    localStorage.setItem("email-view", v)
  }

  useEffect(() => {
    async function load() {
      const [recentRes, starredRes] = await Promise.all([
        fetch("/api/emails"),
        fetch("/api/emails/starred"),
      ])
      const recentData = (await recentRes.json()) as { messages: GmailMessage[] }
      const starredData = (await starredRes.json()) as { messages: GmailMessage[] }
      setRecent(recentData.messages ?? [])
      setStarred(starredData.messages ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const handleArchived = useCallback((gmailId: string) => {
    setRecent((prev) => prev.filter((m) => m.id !== gmailId))
    setStarred((prev) => prev.filter((m) => m.id !== gmailId))
  }, [])

  const handleFavoriteToggled = useCallback((gmailId: string, favorited: boolean) => {
    const update = (msgs: GmailMessage[]) => {
      const updated = msgs.map((m) =>
        m.id === gmailId ? { ...m, isFavorited: favorited } : m
      )
      return [...updated].sort((a, b) => {
        if (a.isFavorited && !b.isFavorited) return -1
        if (!a.isFavorited && b.isFavorited) return 1
        return 0
      })
    }
    setRecent(update)
    setStarred(update)
  }, [])

  const filteredRecent = useMemo(() => filterMessages(recent, search), [recent, search])
  const filteredStarred = useMemo(() => filterMessages(starred, search), [starred, search])

  const cardVariant = viewMode === "spacious" ? "comfortable" : viewMode

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasAny = recent.length > 0 || starred.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Email</h1>
          <p className="text-muted-foreground text-sm">Recent messages from Gmail</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject or sender..."
              className="h-8 pl-8 text-xs w-[220px]"
            />
          </div>
          <ViewToggle pageKey="email" value={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      {!hasAny ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MailX className="size-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium">No emails found</p>
          <p className="text-sm text-muted-foreground">
            Connect your Google account to see emails here.
          </p>
        </div>
      ) : (
        <Tabs defaultValue={starred.length > 0 ? "starred" : "recent"}>
          <TabsList>
            <TabsTrigger value="starred">
              Starred{starred.length > 0 ? ` (${starred.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="recent">
              Recent{recent.length > 0 ? ` (${recent.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="starred" className="mt-4">
            {filteredStarred.length > 0 ? (
              <div className={getGridClass(viewMode)}>
                {filteredStarred.map((msg) => (
                  <EmailCard
                    key={msg.id}
                    message={msg}
                    onArchived={handleArchived}
                    onFavoriteToggled={handleFavoriteToggled}
                    variant={cardVariant}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {search ? "No starred emails match your search" : "No starred emails"}
              </p>
            )}
          </TabsContent>
          <TabsContent value="recent" className="mt-4">
            {filteredRecent.length > 0 ? (
              <div className={getGridClass(viewMode)}>
                {filteredRecent.map((msg) => (
                  <EmailCard
                    key={msg.id}
                    message={msg}
                    onArchived={handleArchived}
                    onFavoriteToggled={handleFavoriteToggled}
                    variant={cardVariant}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {search ? "No recent emails match your search" : "No recent emails"}
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
