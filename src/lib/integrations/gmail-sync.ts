import { client } from "@/lib/db"
import { fetchGmailMessages, type GmailMessage } from "./gmail"

interface SyncResult {
  synced: number
  error?: string
}

export async function syncGmailMessages(userId: string): Promise<SyncResult> {
  // Fetch recent inbox + starred in parallel
  const [inboxResult, starredResult] = await Promise.all([
    fetchGmailMessages(userId, 25),
    fetchGmailMessages(userId, 25, "is:starred"),
  ])

  if (inboxResult.error && inboxResult.error !== "gmail_scope_missing") {
    return { synced: 0, error: inboxResult.error }
  }

  // Merge and dedupe by gmail ID, mark starred ones
  const starredIds = new Set(starredResult.messages.map((m) => m.id))
  const seen = new Map<string, GmailMessage & { isStarred: boolean }>()

  for (const msg of starredResult.messages) {
    seen.set(msg.id, { ...msg, isStarred: true })
  }
  for (const msg of inboxResult.messages) {
    if (!seen.has(msg.id)) {
      seen.set(msg.id, { ...msg, isStarred: starredIds.has(msg.id) })
    }
  }

  const all = [...seen.values()]
  if (all.length === 0) return { synced: 0 }

  // Upsert in batches of 10
  let synced = 0
  const BATCH = 10
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH)
    await client.batch(
      batch.map((msg) => ({
        sql: `INSERT INTO emails (id, user_id, gmail_id, thread_id, subject, from_raw, snippet, date, is_starred, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
              ON CONFLICT (user_id, gmail_id) DO UPDATE SET
                subject = excluded.subject,
                from_raw = excluded.from_raw,
                snippet = excluded.snippet,
                date = excluded.date,
                is_starred = excluded.is_starred,
                updated_at = unixepoch()`,
        args: [
          crypto.randomUUID(),
          userId,
          msg.id,
          msg.threadId,
          msg.subject,
          msg.from,
          msg.snippet,
          msg.date,
          msg.isStarred ? 1 : 0,
        ],
      }))
    )
    synced += batch.length
  }

  return { synced }
}
