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
  const inboxIds = new Set(inboxResult.messages.map((m) => m.id))
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

  // Upsert in batches of 10 — is_archived excluded from DO UPDATE SET to preserve user's archive action.
  // New rows default to is_archived = 0 via the INSERT.
  let synced = 0
  const BATCH = 10
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH)
    await client.batch(
      batch.map((msg) => ({
        sql: `INSERT INTO emails (id, user_id, gmail_id, thread_id, subject, from_raw, snippet, date, is_starred, is_archived, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, unixepoch())
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

  // If a message reappears in the inbox fetch, clear any prior archive flag.
  // This handles the case where a user un-archives in Gmail (message gets INBOX label back).
  if (inboxIds.size > 0) {
    const inboxArr = [...inboxIds]
    for (let i = 0; i < inboxArr.length; i += BATCH) {
      const batchIds = inboxArr.slice(i, i + BATCH)
      const placeholders = batchIds.map(() => "?").join(", ")
      await client.execute({
        sql: `UPDATE emails SET is_archived = 0, updated_at = unixepoch()
              WHERE user_id = ? AND gmail_id IN (${placeholders}) AND is_archived = 1`,
        args: [userId, ...batchIds],
      })
    }
  }

  return { synced }
}
