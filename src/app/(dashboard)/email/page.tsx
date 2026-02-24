"use client"

import { useState, useEffect } from "react"
import { Loader2, MailX } from "lucide-react"
import { EmailList } from "@/components/email/email-list"

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
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
        <>
          {starred.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">Starred</h2>
              <EmailList messages={starred} />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">Recent</h2>
            <EmailList messages={recent} />
          </div>
        </>
      )}
    </div>
  )
}
