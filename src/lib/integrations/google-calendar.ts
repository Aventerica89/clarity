import { google } from "googleapis"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { account, events, integrations } from "@/lib/schema"

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

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export async function syncGoogleCalendarEvents(userId: string): Promise<{
  synced: number
  error?: string
}> {
  const googleAccount = await getGoogleAccount(userId)
  if (!googleAccount) {
    return { synced: 0, error: "Google account not connected" }
  }
  if (!googleAccount.accessToken) {
    return { synced: 0, error: "No Google access token" }
  }
  if (!googleAccount.refreshToken) {
    return {
      synced: 0,
      error: "No refresh token is set. Please sign out and sign back in with Google to re-authorize.",
    }
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: googleAccount.accessToken,
    refresh_token: googleAccount.refreshToken ?? undefined,
    expiry_date: googleAccount.accessTokenExpiresAt
      ? googleAccount.accessTokenExpiresAt.getTime()
      : undefined,
  })

  // Persist refreshed tokens back to account table
  oauth2Client.on("tokens", async (tokens) => {
    const updates: Partial<typeof account.$inferInsert> = {}
    if (tokens.access_token) updates.accessToken = tokens.access_token
    if (tokens.expiry_date) {
      updates.accessTokenExpiresAt = new Date(tokens.expiry_date)
    }
    if (Object.keys(updates).length > 0) {
      await db
        .update(account)
        .set(updates)
        .where(
          and(eq(account.userId, userId), eq(account.providerId, "google")),
        )
    }
  })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })
  const { start, end } = todayRange()

  let rawEvents
  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    })
    rawEvents = res.data.items ?? []
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { synced: 0, error: `Calendar API error: ${msg}` }
  }

  let synced = 0
  for (const ev of rawEvents) {
    if (!ev.id || !ev.summary) continue

    const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime)
    const startAt = ev.start?.dateTime
      ? new Date(ev.start.dateTime)
      : ev.start?.date
        ? new Date(ev.start.date)
        : null
    const endAt = ev.end?.dateTime
      ? new Date(ev.end.dateTime)
      : ev.end?.date
        ? new Date(ev.end.date)
        : null

    if (!startAt || !endAt) continue

    await db
      .insert(events)
      .values({
        userId,
        source: "google_calendar",
        sourceId: ev.id,
        title: ev.summary,
        startAt,
        endAt,
        isAllDay,
        calendarName: "primary",
        location: ev.location ?? null,
        metadata: JSON.stringify({ htmlLink: ev.htmlLink ?? "" }),
      })
      .onConflictDoUpdate({
        target: [events.userId, events.source, events.sourceId],
        set: {
          title: ev.summary,
          startAt,
          endAt,
          isAllDay,
          location: ev.location ?? null,
          updatedAt: new Date(),
        },
      })
    synced++
  }

  // Update integration sync status
  await db
    .insert(integrations)
    .values({
      userId,
      provider: "google",
      syncStatus: "ok",
      lastSyncedAt: new Date(),
      lastError: null,
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: {
        syncStatus: "ok",
        lastSyncedAt: new Date(),
        lastError: null,
      },
    })

  return { synced }
}
