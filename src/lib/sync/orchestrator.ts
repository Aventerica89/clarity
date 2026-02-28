import { syncGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { syncTodoistTasks } from "@/lib/integrations/todoist"
import { syncGmailMessages } from "@/lib/integrations/gmail-sync"
import { syncTriageQueue } from "@/lib/triage/sync"

interface SyncResult {
  userId: string
  google?: { synced: number; error?: string }
  todoist?: { synced: number; error?: string }
  gmail?: { synced: number; error?: string }
  triage?: { added: number; skipped: number; errors: string[] }
}

export async function syncAllForUser(userId: string): Promise<SyncResult> {
  // Plaid sync is manual-only (free tier limit) — use /api/plaid/sync
  const settled = await Promise.allSettled([
    syncGoogleCalendarEvents(userId),
    syncTodoistTasks(userId),
    syncGmailMessages(userId),
  ])

  function extractResult(
    result: PromiseSettledResult<{ synced: number; error?: string }>,
  ): { synced: number; error?: string } {
    if (result.status === "fulfilled") return result.value
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
    return { synced: 0, error: message }
  }

  const google = extractResult(
    settled[0] as PromiseSettledResult<{ synced: number; error?: string }>,
  )
  const todoist = extractResult(
    settled[1] as PromiseSettledResult<{ synced: number; error?: string }>,
  )
  const gmail = extractResult(
    settled[2] as PromiseSettledResult<{ synced: number; error?: string }>,
  )
  // Triage sync runs after source syncs complete (needs fresh data)
  let triage: SyncResult["triage"]
  try {
    triage = await syncTriageQueue(userId)
  } catch (err) {
    triage = { added: 0, skipped: 0, errors: [err instanceof Error ? err.message : String(err)] }
  }

  return { userId, google, todoist, gmail, triage }
}

export async function syncAllUsers(userIds: string[]): Promise<SyncResult[]> {
  return Promise.all(userIds.map((id) => syncAllForUser(id)))
}
