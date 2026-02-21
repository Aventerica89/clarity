import { syncGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { syncTodoistTasks } from "@/lib/integrations/todoist"
import { syncPlaidForUser } from "@/lib/plaid/sync"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { plaidItems } from "@/lib/schema"

interface SyncResult {
  userId: string
  google?: { synced: number; error?: string }
  todoist?: { synced: number; error?: string }
  plaid?: { synced: number; error?: string }
}

export async function syncAllForUser(userId: string): Promise<SyncResult> {
  // Check if user has Plaid items before calling Plaid sync
  const userPlaidItems = await db
    .select({ id: plaidItems.id })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId))
    .limit(1)

  const hasPlaid = userPlaidItems.length > 0

  const tasks: Promise<unknown>[] = [
    syncGoogleCalendarEvents(userId),
    syncTodoistTasks(userId),
    ...(hasPlaid ? [syncPlaidForUser(userId)] : []),
  ]

  const [google, todoist, plaid] = await Promise.all(tasks) as [
    { synced: number; error?: string },
    { synced: number; error?: string },
    { synced: number; error?: string } | undefined,
  ]

  return { userId, google, todoist, ...(hasPlaid ? { plaid } : {}) }
}

export async function syncAllUsers(userIds: string[]): Promise<SyncResult[]> {
  return Promise.all(userIds.map((id) => syncAllForUser(id)))
}
