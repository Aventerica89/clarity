import { eq, and } from "drizzle-orm"
import { db, client } from "@/lib/db"
import { triageQueue, account, tasks } from "@/lib/schema"
import { fetchGmailMessages, scoreGmailMessage } from "@/lib/integrations/gmail"
import { fetchGoogleTasks } from "@/lib/integrations/google-tasks"
import { scoreTodoistTask, scoreCalendarEvent, scoreGoogleTask } from "./score-structured"

const SCORE_THRESHOLD = 60

interface SyncResult {
  added: number
  skipped: number
  errors: string[]
}

export async function syncTriageQueue(userId: string): Promise<SyncResult> {
  const errors: string[] = []
  let added = 0
  let skipped = 0

  // ── Gmail ──────────────────────────────────────────────────────────────────
  const { messages, error: gmailError } = await fetchGmailMessages(userId, 25)

  if (gmailError && gmailError !== "gmail_scope_missing") {
    errors.push(`Gmail: ${gmailError}`)
  } else if (!gmailError) {
    // Score in batches of 5 to avoid Anthropic rate limits (429)
    const BATCH_SIZE = 5
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE)
      const scored = await Promise.allSettled(
        batch.map(async (msg) => ({
          msg,
          score: await scoreGmailMessage(msg),
        }))
      )

      for (const result of scored) {
        if (result.status === "rejected") {
          errors.push(`Gmail scoring: ${result.reason}`)
          continue
        }

        const { msg, score } = result.value
        if (score.score < SCORE_THRESHOLD) { skipped++; continue }

        const upserted = await upsertTriageItem(userId, {
          source: "gmail",
          sourceId: msg.id,
          title: msg.subject,
          snippet: msg.snippet,
          aiScore: score.score,
          aiReasoning: score.reasoning,
          sourceMetadata: JSON.stringify({ threadId: msg.threadId, from: msg.from, date: msg.date }),
        })
        if (upserted) added++
        else skipped++
      }
    }
  }

  // ── Todoist overdue/high-priority ──────────────────────────────────────────
  // Use already-synced local tasks to avoid extra API calls and to respect
  // user-hidden/dismissed items in Clarity.
  try {
    const todoistTasks = await db
      .select({
        sourceId: tasks.sourceId,
        title: tasks.title,
        description: tasks.description,
        dueDate: tasks.dueDate,
        priorityManual: tasks.priorityManual,
        metadata: tasks.metadata,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.source, "todoist"),
          eq(tasks.isCompleted, false),
          eq(tasks.isHidden, false),
          eq(tasks.triaged, false),
        ),
      )

    for (const task of todoistTasks) {
      if (!task.sourceId) continue

      let priority = task.priorityManual ?? 1
      if (task.metadata) {
        try {
          const parsed = JSON.parse(task.metadata) as { todoistPriority?: number }
          if (typeof parsed.todoistPriority === "number") {
            priority = parsed.todoistPriority
          }
        } catch {
          // Malformed metadata — fallback to priorityManual
        }
      }

      const score = scoreTodoistTask({ priority, dueDate: task.dueDate, title: task.title })
      if (score.score < SCORE_THRESHOLD) { skipped++; continue }

      const upserted = await upsertTriageItem(userId, {
        source: "todoist",
        sourceId: task.sourceId,
        title: task.title,
        snippet: task.description ?? "",
        aiScore: score.score,
        aiReasoning: score.reasoning,
        sourceMetadata: JSON.stringify({ priority, dueDate: task.dueDate }),
      })
      if (upserted) added++
      else skipped++
    }
  } catch (err) {
    errors.push(`Todoist: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── Google Calendar upcoming ───────────────────────────────────────────────
  try {
    const googleAccount = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
      .limit(1)
      .then((r) => r[0])

    if (googleAccount?.accessToken) {
      const { google } = await import("googleapis")
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      )
      oauth2Client.setCredentials({
        access_token: googleAccount.accessToken,
        refresh_token: googleAccount.refreshToken ?? undefined,
      })

      const calendar = google.calendar({ version: "v3", auth: oauth2Client })
      const now = new Date()
      const weekAhead = new Date(Date.now() + 7 * 86400000)

      const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: weekAhead.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 20,
      })

      for (const event of res.data.items ?? []) {
        const startAt = event.start?.dateTime ?? event.start?.date
        if (!startAt) continue

        const score = scoreCalendarEvent({ startAt, title: event.summary ?? "" })
        if (score.score < SCORE_THRESHOLD) { skipped++; continue }

        const upserted = await upsertTriageItem(userId, {
          source: "google_calendar",
          sourceId: event.id!,
          title: event.summary ?? "(no title)",
          snippet: event.description?.slice(0, 200) ?? "",
          aiScore: score.score,
          aiReasoning: score.reasoning,
          sourceMetadata: JSON.stringify({ startAt, location: event.location }),
        })
        if (upserted) added++
        else skipped++
      }
    }
  } catch (err) {
    errors.push(`Calendar: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── Google Tasks ─────────────────────────────────────────────────────────────
  try {
    const { tasks: googleTasks, error: tasksError } = await fetchGoogleTasks(userId)

    if (tasksError && tasksError !== "tasks_scope_missing" && tasksError !== "google_not_connected") {
      errors.push(`Google Tasks: ${tasksError}`)
    } else if (!tasksError) {
      for (const task of googleTasks) {
        const score = scoreGoogleTask({ title: task.title, due: task.due, notes: task.notes })
        if (score.score < SCORE_THRESHOLD) { skipped++; continue }

        const upserted = await upsertTriageItem(userId, {
          source: "google_tasks",
          sourceId: task.id,
          title: task.title,
          snippet: task.notes.slice(0, 200),
          aiScore: score.score,
          aiReasoning: score.reasoning,
          sourceMetadata: JSON.stringify({ due: task.due, status: task.status }),
        })
        if (upserted) added++
        else skipped++
      }
    }
  } catch (err) {
    errors.push(`Google Tasks: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { added, skipped, errors }
}

interface UpsertInput {
  source: string
  sourceId: string
  title: string
  snippet: string
  aiScore: number
  aiReasoning: string
  sourceMetadata: string
}

async function upsertTriageItem(userId: string, input: UpsertInput): Promise<boolean> {
  const id = crypto.randomUUID()
  const result = await client.execute({
    sql: `INSERT INTO triage_queue
            (id, user_id, source, source_id, title, snippet, ai_score, ai_reasoning, source_metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (user_id, source, source_id) DO UPDATE SET
            title          = excluded.title,
            snippet        = excluded.snippet,
            ai_score       = excluded.ai_score,
            ai_reasoning   = excluded.ai_reasoning,
            source_metadata = excluded.source_metadata
          WHERE triage_queue.status = 'pending'`,
    args: [
      id, userId, input.source, input.sourceId, input.title, input.snippet,
      input.aiScore, input.aiReasoning, input.sourceMetadata,
    ],
  })
  return (result.rowsAffected ?? 0) > 0
}
