"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, MailX } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmailList } from "@/components/email/email-list"

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
  isFavorited?: boolean
}

export default function EmailPage() {
  const [recent, setRecent] = useState<GmailMessage[]>([])
  const [starred, setStarred] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasAny = recent.length > 0 || starred.length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email</h1>
        <p className="text-muted-foreground text-sm">Recent messages from Gmail</p>
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
            {starred.length > 0 ? (
              <EmailList
                messages={starred}
                onArchived={handleArchived}
                onFavoriteToggled={handleFavoriteToggled}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No starred emails
              </p>
            )}
          </TabsContent>
          <TabsContent value="recent" className="mt-4">
            {recent.length > 0 ? (
              <EmailList
                messages={recent}
                onArchived={handleArchived}
                onFavoriteToggled={handleFavoriteToggled}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No recent emails
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
