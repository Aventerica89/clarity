import { syncGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { syncTodoistTasks } from "@/lib/integrations/todoist"

interface SyncResult {
  userId: string
  google?: { synced: number; error?: string }
  todoist?: { synced: number; error?: string }
}

export async function syncAllForUser(userId: string): Promise<SyncResult> {
  const [google, todoist] = await Promise.all([
    syncGoogleCalendarEvents(userId),
    syncTodoistTasks(userId),
  ])
  return { userId, google, todoist }
}

export async function syncAllUsers(
  userIds: string[],
): Promise<SyncResult[]> {
  return Promise.all(userIds.map((id) => syncAllForUser(id)))
}
