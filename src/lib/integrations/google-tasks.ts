import { google } from "googleapis"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { account } from "@/lib/schema"

export interface GoogleTask {
  id: string
  title: string
  notes: string
  due: string | null
  status: string
  updated: string
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
}

async function getGoogleAccount(userId: string) {
  const rows = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1)
  return rows[0] ?? null
}

export async function fetchGoogleTasks(userId: string): Promise<{
  tasks: GoogleTask[]
  error?: string
}> {
  const googleAccount = await getGoogleAccount(userId)
  if (!googleAccount?.accessToken) {
    return { tasks: [], error: "google_not_connected" }
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: googleAccount.accessToken,
    refresh_token: googleAccount.refreshToken ?? undefined,
    expiry_date: googleAccount.accessTokenExpiresAt?.getTime(),
  })

  // Persist refreshed tokens
  oauth2Client.on("tokens", async (tokens) => {
    const updates: Record<string, unknown> = {}
    if (tokens.access_token) updates.accessToken = tokens.access_token
    if (tokens.expiry_date) updates.accessTokenExpiresAt = new Date(tokens.expiry_date)
    if (Object.keys(updates).length > 0) {
      await db.update(account).set(updates).where(
        and(eq(account.userId, userId), eq(account.providerId, "google"))
      )
    }
  })

  const tasksApi = google.tasks({ version: "v1", auth: oauth2Client })

  let taskListsRes
  try {
    taskListsRes = await tasksApi.tasklists.list({ maxResults: 10 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes("insufficientPermissions") ||
      msg.includes("Request had insufficient authentication scopes")
    ) {
      return { tasks: [], error: "tasks_scope_missing" }
    }
    return { tasks: [], error: msg }
  }

  const allTasks: GoogleTask[] = []
  const taskLists = taskListsRes.data.items ?? []

  for (const list of taskLists) {
    if (!list.id) continue

    try {
      const res = await tasksApi.tasks.list({
        tasklist: list.id,
        showCompleted: false,
        maxResults: 50,
      })

      for (const item of res.data.items ?? []) {
        if (!item.id || !item.title) continue
        allTasks.push({
          id: item.id,
          title: item.title,
          notes: item.notes ?? "",
          due: item.due ?? null,
          status: item.status ?? "needsAction",
          updated: item.updated ?? new Date().toISOString(),
        })
      }
    } catch {
      // Skip individual list errors
    }
  }

  return { tasks: allTasks }
}
