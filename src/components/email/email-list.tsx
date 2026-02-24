"use client"

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

interface EmailListProps {
  messages: GmailMessage[]
  onArchived?: (gmailId: string) => void
  onFavoriteToggled?: (gmailId: string, favorited: boolean) => void
}

export function EmailList({ messages, onArchived, onFavoriteToggled }: EmailListProps) {
  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <EmailCard
          key={msg.id}
          message={msg}
          onArchived={onArchived}
          onFavoriteToggled={onFavoriteToggled}
        />
      ))}
    </div>
  )
}
