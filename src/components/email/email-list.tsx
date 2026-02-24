"use client"

import { EmailCard } from "@/components/email/email-card"

interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
}

interface EmailListProps {
  messages: GmailMessage[]
}

export function EmailList({ messages }: EmailListProps) {
  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <EmailCard key={msg.id} message={msg} />
      ))}
    </div>
  )
}
