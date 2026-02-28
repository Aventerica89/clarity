import { client, db } from "@/lib/db"
import { integrations } from "@/lib/schema"
import { and, eq } from "drizzle-orm"
import {
  fetchGmailMessages,
  fetchGmailMessagesSince,
  getGmailProfileHistoryId,
  type GmailMessage,
} from "./gmail"

interface SyncResult {
  synced: number
  error?: string
}

async function readStoredHistoryId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ config: integrations.config })
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, "gmail")))
    .limit(1)
  if (!rows[0]) return null
  try {
    const cfg = JSON.parse(rows[0].config) as { historyId?: string }
    return cfg.historyId ?? null
  } catch {
    return null
  }
}

async function saveHistoryId(userId: string, historyId: string): Promise<void> {
  await client.execute({
    sql: `INSERT INTO integrations (id, user_id, provider, config, sync_status)
          VALUES (?, ?, 'gmail', ?, 'idle')
          ON CONFLICT (user_id, provider) DO UPDATE SET
            config = excluded.config,
            last_synced_at = unixepoch()`,
    args: [crypto.randomUUID(), userId, JSON.stringify({ historyId })],
  })
}

async function upsertMessages(
  userId: string,
  messages: (GmailMessage & { isStarred: boolean })[],
): Promise<void> {
  const BATCH = 10
  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH)
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
  }
}

export async function syncGmailMessages(userId: string): Promise<SyncResult> {
  const storedHistoryId = await readStoredHistoryId(userId)

  if (storedHistoryId) {
    const { messages, newHistoryId, error } = await fetchGmailMessagesSince(
      userId,
      storedHistoryId,
    )

    if (error === "history_expired" || error === "google_not_connected") {
      // Fall through to full sync
    } else if (error) {
      return { synced: 0, error }
    } else {
      // Incremental sync succeeded
      if (messages.length > 0) {
        await upsertMessages(
          userId,
          messages.map((m) => ({ ...m, isStarred: false })),
        )
      }
      if (newHistoryId) await saveHistoryId(userId, newHistoryId)
      return { synced: messages.length }
    }
  }

  // Full sync (first run or after history expiry)
  const [inboxResult, starredResult] = await Promise.all([
    fetchGmailMessages(userId, 25),
    fetchGmailMessages(userId, 25, "is:starred"),
  ])

  if (inboxResult.error && inboxResult.error !== "gmail_scope_missing") {
    return { synced: 0, error: inboxResult.error }
  }

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

  await upsertMessages(userId, all)

  // Clear archive flag for messages that reappeared in inbox
  const BATCH = 10
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

  // Snapshot historyId so next sync can be incremental
  const historyId = await getGmailProfileHistoryId(userId)
  if (historyId) await saveHistoryId(userId, historyId)

  return { synced: all.length }
}
