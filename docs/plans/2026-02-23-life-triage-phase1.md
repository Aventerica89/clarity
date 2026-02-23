# Life Triage Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Gmail-first triage queue that scores all sources (Gmail, Todoist overdue, Google Calendar), shows a badge count on the nav, lets you approve/dismiss/push-to-context, and converts approved items into Todoist tasks with AI-generated subtasks.

**Architecture:** New `triage_queue` table stores flagged items from all sources. Structured sources (Todoist, Calendar) use deterministic scoring. Unstructured sources (Gmail) use Claude Haiku to infer urgency. A `/triage` page renders the queue; an approve flow calls the Todoist API to create a task with subtasks.

**Tech Stack:** Next.js App Router, Drizzle ORM + Turso LibSQL, Google Gmail REST API, Todoist REST API v2, Claude Haiku (`claude-haiku-4-5-20251001`), shadcn/ui, `googleapis` npm package (already installed).

---

## Task 1: Schema — triage_queue table

**Files:**
- Modify: `src/lib/schema.ts`
- Create: `supabase/migrations/0004_triage_queue.sql`

**Step 1: Write the migration SQL**

Create `supabase/migrations/0004_triage_queue.sql`:

```sql
CREATE TABLE IF NOT EXISTS `triage_queue` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `source` text NOT NULL,
  `source_id` text NOT NULL,
  `title` text NOT NULL,
  `snippet` text NOT NULL DEFAULT '',
  `ai_score` integer NOT NULL DEFAULT 0,
  `ai_reasoning` text NOT NULL DEFAULT '',
  `status` text NOT NULL DEFAULT 'pending',
  `todoist_task_id` text,
  `source_metadata` text NOT NULL DEFAULT '{}',
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `reviewed_at` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `triage_user_source_idx`
  ON `triage_queue` (`user_id`, `source`, `source_id`);

CREATE INDEX IF NOT EXISTS `triage_user_status_idx`
  ON `triage_queue` (`user_id`, `status`);
```

**Step 2: Add the Drizzle table definition to schema.ts**

In `src/lib/schema.ts`, after the `chatSessions` table, add:

```typescript
// Triage queue — AI-scored items from all sources, pending user review
export const triageQueue = sqliteTable("triage_queue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // gmail | google_calendar | todoist | apple_reminders | apple_notes | apple_mail | apple_calendar
  sourceId: text("source_id").notNull(),
  title: text("title").notNull(),
  snippet: text("snippet").notNull().default(""),
  aiScore: integer("ai_score").notNull().default(0),
  aiReasoning: text("ai_reasoning").notNull().default(""),
  status: text("status", { enum: ["pending", "approved", "dismissed", "pushed_to_context"] })
    .notNull()
    .default("pending"),
  todoistTaskId: text("todoist_task_id"),
  sourceMetadata: text("source_metadata").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
}, (t) => [
  uniqueIndex("triage_user_source_idx").on(t.userId, t.source, t.sourceId),
])
```

**Step 3: Run the migration against Turso**

Turso doesn't use `drizzle-kit push` in prod. Apply via HTTP API (same pattern used for previous schema changes):

```bash
curl -X POST "$TURSO_DATABASE_URL/v2/pipeline" \
  -H "Authorization: Bearer $TURSO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      { "type": "execute", "stmt": { "sql": "CREATE TABLE IF NOT EXISTS triage_queue (id text PRIMARY KEY NOT NULL, user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE, source text NOT NULL, source_id text NOT NULL, title text NOT NULL, snippet text NOT NULL DEFAULT \"\", ai_score integer NOT NULL DEFAULT 0, ai_reasoning text NOT NULL DEFAULT \"\", status text NOT NULL DEFAULT \"pending\", todoist_task_id text, source_metadata text NOT NULL DEFAULT \"{}\", created_at integer NOT NULL DEFAULT (unixepoch()), reviewed_at integer)" } },
      { "type": "execute", "stmt": { "sql": "CREATE UNIQUE INDEX IF NOT EXISTS triage_user_source_idx ON triage_queue (user_id, source, source_id)" } },
      { "type": "execute", "stmt": { "sql": "CREATE INDEX IF NOT EXISTS triage_user_status_idx ON triage_queue (user_id, status)" } },
      { "type": "close" }
    ]
  }'
```

Expected: `{"results":[...]}` with no errors.

**Step 4: Verify the table exists**

```bash
curl -X POST "$TURSO_DATABASE_URL/v2/pipeline" \
  -H "Authorization: Bearer $TURSO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requests":[{"type":"execute","stmt":{"sql":"SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"triage_queue\""}},{"type":"close"}]}'
```

Expected: `"triage_queue"` in results.

**Step 5: Commit**

```bash
git add src/lib/schema.ts supabase/migrations/0004_triage_queue.sql
git commit -m "feat: add triage_queue table and schema definition"
```

---

## Task 2: Add Gmail scope to Google OAuth

**Files:**
- Modify: `src/lib/auth.ts`

**Step 1: Add gmail.readonly scope**

In `src/lib/auth.ts`, update the `scope` array inside `socialProviders.google`:

```typescript
scope: [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
],
```

**Step 2: Verify the change**

```bash
grep -A 10 "scope:" src/lib/auth.ts
```

Expected: both calendar.readonly and gmail.readonly present.

**Step 3: Note — existing users need re-consent**

Existing Google accounts won't have the Gmail scope. The Gmail adapter must gracefully handle `insufficientPermissions` errors (returns `{ items: [], error: "gmail_scope_missing" }`). The triage page shows a "Reconnect Google" prompt when this error is present.

**Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add gmail.readonly scope to Google OAuth"
```

---

## Task 3: Gmail triage adapter

**Files:**
- Create: `src/lib/integrations/gmail.ts`
- Create: `src/lib/triage/score-unstructured.ts`
- Create: `tests/lib/integrations/gmail.test.ts`

**Step 1: Write the failing tests**

Create `tests/lib/integrations/gmail.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { scoreGmailMessage, type GmailMessage } from "@/lib/integrations/gmail"

describe("scoreGmailMessage", () => {
  it("returns score and reasoning for a message", async () => {
    const msg: GmailMessage = {
      id: "abc123",
      threadId: "thread1",
      subject: "Urgent: Your account needs attention",
      from: "alerts@bank.com",
      snippet: "Your account has been flagged for unusual activity.",
      date: new Date().toISOString(),
    }

    const result = await scoreGmailMessage(msg)

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.reasoning).toBeTruthy()
    expect(typeof result.reasoning).toBe("string")
  })

  it("returns low score for newsletter-like content", async () => {
    const msg: GmailMessage = {
      id: "def456",
      threadId: "thread2",
      subject: "Your weekly digest is ready",
      from: "newsletter@medium.com",
      snippet: "Top stories this week: React 19 is out...",
      date: new Date().toISOString(),
    }

    const result = await scoreGmailMessage(msg)
    expect(result.score).toBeLessThan(60)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/integrations/gmail.test.ts
```

Expected: FAIL — `scoreGmailMessage` not defined.

**Step 3: Create the Gmail adapter**

Create `src/lib/integrations/gmail.ts`:

```typescript
import { google } from "googleapis"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { account } from "@/lib/schema"
import Anthropic from "@anthropic-ai/sdk"

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
}

interface TriageScore {
  score: number
  reasoning: string
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

export async function scoreGmailMessage(msg: GmailMessage): Promise<TriageScore> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set")

  const client = new Anthropic({ apiKey })

  const prompt = [
    `Rate the urgency of this email for a busy professional (0-100).`,
    `0 = newsletter/promotional, 100 = requires action today.`,
    ``,
    `From: ${msg.from}`,
    `Subject: ${msg.subject}`,
    `Preview: ${msg.snippet}`,
    ``,
    `Respond with JSON only: {"score": <number>, "reasoning": "<one sentence>"}`,
  ].join("\n")

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  try {
    const parsed = JSON.parse(text) as { score: number; reasoning: string }
    return {
      score: Math.max(0, Math.min(100, parsed.score)),
      reasoning: parsed.reasoning ?? "Flagged by AI",
    }
  } catch {
    return { score: 50, reasoning: "Could not parse AI response" }
  }
}

export async function fetchGmailMessages(userId: string, maxResults = 100): Promise<{
  messages: GmailMessage[]
  error?: string
}> {
  const googleAccount = await getGoogleAccount(userId)
  if (!googleAccount?.accessToken) {
    return { messages: [], error: "google_not_connected" }
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

  const gmail = google.gmail({ version: "v1", auth: oauth2Client })

  let listRes
  try {
    listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: "in:inbox -category:promotions -category:social -category:updates",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("insufficientPermissions") || msg.includes("Request had insufficient authentication scopes")) {
      return { messages: [], error: "gmail_scope_missing" }
    }
    return { messages: [], error: msg }
  }

  const ids = listRes.data.messages ?? []
  const messages: GmailMessage[] = []

  // Fetch headers in parallel (batches of 10)
  const chunks = []
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10))

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map((m) =>
        gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        })
      )
    )

    for (const result of results) {
      if (result.status !== "fulfilled") continue
      const msg = result.value.data
      const headers = msg.payload?.headers ?? []
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? ""

      messages.push({
        id: msg.id!,
        threadId: msg.threadId!,
        subject: get("Subject") || "(no subject)",
        from: get("From"),
        snippet: (msg.snippet ?? "").slice(0, 300),
        date: get("Date"),
      })
    }
  }

  return { messages }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/lib/integrations/gmail.test.ts
```

Expected: PASS (requires `ANTHROPIC_API_KEY` in env; skip in CI with `vi.mock`).

**Step 5: Commit**

```bash
git add src/lib/integrations/gmail.ts tests/lib/integrations/gmail.test.ts
git commit -m "feat: Gmail adapter with Haiku urgency scoring"
```

---

## Task 4: Triage scoring for structured sources

**Files:**
- Create: `src/lib/triage/score-structured.ts`
- Create: `tests/lib/triage/score-structured.test.ts`

**Step 1: Write the failing tests**

Create `tests/lib/triage/score-structured.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  scoreTodoistTask,
  scoreCalendarEvent,
} from "@/lib/triage/score-structured"

describe("scoreTodoistTask", () => {
  it("scores overdue P1 task at 95", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
    const result = scoreTodoistTask({ priority: 4, dueDate: yesterday, title: "Test" })
    expect(result.score).toBe(95)
    expect(result.reasoning).toContain("overdue")
  })

  it("scores P1 task due today at 85", () => {
    const today = new Date().toISOString().split("T")[0]
    const result = scoreTodoistTask({ priority: 4, dueDate: today, title: "Test" })
    expect(result.score).toBe(85)
  })

  it("scores P4 task with no due date at 20", () => {
    const result = scoreTodoistTask({ priority: 1, dueDate: null, title: "Test" })
    expect(result.score).toBe(20)
  })
})

describe("scoreCalendarEvent", () => {
  it("scores event in next 4 hours at 80", () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    const result = scoreCalendarEvent({ startAt: soon, title: "Team standup" })
    expect(result.score).toBeGreaterThanOrEqual(75)
  })

  it("scores event 5 days away at 30", () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString()
    const result = scoreCalendarEvent({ startAt: future, title: "Dentist" })
    expect(result.score).toBeLessThan(50)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/triage/score-structured.test.ts
```

Expected: FAIL — modules not found.

**Step 3: Implement score-structured.ts**

Create `src/lib/triage/score-structured.ts`:

```typescript
interface TriageScore {
  score: number
  reasoning: string
}

interface TodoistInput {
  priority: number // 1=normal, 2=medium, 3=high, 4=urgent
  dueDate: string | null // YYYY-MM-DD
  title: string
}

interface CalendarInput {
  startAt: string // ISO datetime
  title: string
}

const PRIORITY_BASE: Record<number, number> = { 4: 40, 3: 30, 2: 20, 1: 10 }

export function scoreTodoistTask(input: TodoistInput): TriageScore {
  const base = PRIORITY_BASE[input.priority] ?? 10
  const priorityLabel = ["normal", "medium", "high", "urgent"][input.priority - 1] ?? "normal"

  if (!input.dueDate) {
    return { score: base / 2, reasoning: `${priorityLabel} priority, no due date` }
  }

  const today = new Date().toISOString().split("T")[0]
  const due = input.dueDate

  if (due < today) {
    return { score: Math.min(95, base + 55), reasoning: `${priorityLabel} priority, overdue` }
  }
  if (due === today) {
    return { score: Math.min(85, base + 45), reasoning: `${priorityLabel} priority, due today` }
  }

  const daysUntil = Math.ceil(
    (new Date(due).getTime() - Date.now()) / 86400000
  )

  if (daysUntil <= 2) {
    return { score: Math.min(75, base + 35), reasoning: `${priorityLabel} priority, due in ${daysUntil} day(s)` }
  }
  if (daysUntil <= 7) {
    return { score: Math.min(60, base + 20), reasoning: `${priorityLabel} priority, due in ${daysUntil} days` }
  }

  return { score: base, reasoning: `${priorityLabel} priority, due in ${daysUntil} days` }
}

export function scoreCalendarEvent(input: CalendarInput): TriageScore {
  const hoursUntil = (new Date(input.startAt).getTime() - Date.now()) / 3600000

  if (hoursUntil < 0) return { score: 0, reasoning: "Event already passed" }
  if (hoursUntil <= 4) return { score: 80, reasoning: `Event in ${Math.round(hoursUntil * 60)} min` }
  if (hoursUntil <= 24) return { score: 65, reasoning: "Event today" }
  if (hoursUntil <= 48) return { score: 50, reasoning: "Event tomorrow" }
  if (hoursUntil <= 168) return { score: 35, reasoning: "Event this week" }

  return { score: 20, reasoning: "Event more than a week away" }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/lib/triage/score-structured.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/triage/score-structured.ts tests/lib/triage/score-structured.test.ts
git commit -m "feat: deterministic triage scoring for Todoist and Calendar"
```

---

## Task 5: Triage sync orchestrator + scan API route

**Files:**
- Create: `src/lib/triage/sync.ts`
- Create: `src/app/api/triage/scan/route.ts`

**Step 1: Create the triage sync orchestrator**

Create `src/lib/triage/sync.ts`:

```typescript
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { triageQueue, account } from "@/lib/schema"
import { fetchGmailMessages, scoreGmailMessage } from "@/lib/integrations/gmail"
import { scoreTodoistTask } from "./score-structured"
import { scoreCalendarEvent } from "./score-structured"
import { decryptToken } from "@/lib/crypto"
import { integrations } from "@/lib/schema"

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
  const { messages, error: gmailError } = await fetchGmailMessages(userId, 100)

  if (gmailError && gmailError !== "gmail_scope_missing") {
    errors.push(`Gmail: ${gmailError}`)
  } else if (!gmailError) {
    const scored = await Promise.allSettled(
      messages.map(async (msg) => ({
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

      await upsertTriageItem(userId, {
        source: "gmail",
        sourceId: msg.id,
        title: msg.subject,
        snippet: msg.snippet,
        aiScore: score.score,
        aiReasoning: score.reasoning,
        sourceMetadata: JSON.stringify({ threadId: msg.threadId, from: msg.from, date: msg.date }),
      })
      added++
    }
  }

  // ── Todoist overdue/high-priority ──────────────────────────────────────────
  try {
    const todoistRow = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "todoist")))
      .limit(1)
      .then((r) => r[0])

    if (todoistRow?.accessTokenEncrypted) {
      const token = decryptToken(todoistRow.accessTokenEncrypted)
      const res = await fetch("https://api.todoist.com/api/v1/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const tasks = Array.isArray(data) ? data : data.results ?? []

      for (const task of tasks) {
        const dueDate = task.due?.date ?? null
        const score = scoreTodoistTask({ priority: task.priority, dueDate, title: task.content })
        if (score.score < SCORE_THRESHOLD) { skipped++; continue }

        await upsertTriageItem(userId, {
          source: "todoist",
          sourceId: task.id,
          title: task.content,
          snippet: task.description ?? "",
          aiScore: score.score,
          aiReasoning: score.reasoning,
          sourceMetadata: JSON.stringify({ priority: task.priority, dueDate }),
        })
        added++
      }
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

        await upsertTriageItem(userId, {
          source: "google_calendar",
          sourceId: event.id!,
          title: event.summary ?? "(no title)",
          snippet: event.description?.slice(0, 200) ?? "",
          aiScore: score.score,
          aiReasoning: score.reasoning,
          sourceMetadata: JSON.stringify({ startAt, location: event.location }),
        })
        added++
      }
    }
  } catch (err) {
    errors.push(`Calendar: ${err instanceof Error ? err.message : String(err)}`)
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

async function upsertTriageItem(userId: string, input: UpsertInput) {
  const id = crypto.randomUUID()
  // Insert or ignore on conflict (keep existing status if already reviewed)
  await db.run(
    // Raw SQL because Drizzle's insertOrIgnore doesn't support partial updates
    // We only update score/reasoning if the item is still pending
    {
      sql: `INSERT INTO triage_queue (id, user_id, source, source_id, title, snippet, ai_score, ai_reasoning, source_metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id, source, source_id) DO UPDATE SET
              title = excluded.title,
              snippet = excluded.snippet,
              ai_score = excluded.ai_score,
              ai_reasoning = excluded.ai_reasoning,
              source_metadata = excluded.source_metadata
            WHERE triage_queue.status = 'pending'`,
      args: [id, userId, input.source, input.sourceId, input.title, input.snippet,
             input.aiScore, input.aiReasoning, input.sourceMetadata],
    }
  )
}
```

**Step 2: Create the scan API route**

Create `src/app/api/triage/scan/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { syncTriageQueue } from "@/lib/triage/sync"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await syncTriageQueue(session.user.id)

  return NextResponse.json(result)
}
```

**Step 3: Test manually**

```bash
# Start the dev server then:
curl -X POST http://localhost:3000/api/triage/scan \
  -H "Cookie: <your session cookie>"
```

Expected: `{"added": N, "skipped": M, "errors": []}`.

**Step 4: Commit**

```bash
git add src/lib/triage/sync.ts src/app/api/triage/scan/route.ts
git commit -m "feat: triage sync orchestrator and scan API route"
```

---

## Task 6: Triage list + review API routes

**Files:**
- Create: `src/app/api/triage/route.ts`
- Create: `src/app/api/triage/[id]/route.ts`

**Step 1: Create the list route**

Create `src/app/api/triage/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { triageQueue } from "@/lib/schema"
import { eq, and, desc } from "drizzle-orm"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "pending"

  const items = await db
    .select()
    .from(triageQueue)
    .where(and(
      eq(triageQueue.userId, session.user.id),
      eq(triageQueue.status, status as "pending" | "approved" | "dismissed" | "pushed_to_context"),
    ))
    .orderBy(desc(triageQueue.aiScore), desc(triageQueue.createdAt))
    .limit(50)

  return NextResponse.json({ items })
}
```

**Step 2: Create the review action route**

Create `src/app/api/triage/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { triageQueue, lifeContextItems } from "@/lib/schema"
import { eq, and } from "drizzle-orm"

type Action = "dismiss" | "push_to_context"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as { action: Action }

  const rows = await db
    .select()
    .from(triageQueue)
    .where(and(eq(triageQueue.id, id), eq(triageQueue.userId, session.user.id)))
    .limit(1)

  const item = rows[0]
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (body.action === "dismiss") {
    await db.update(triageQueue)
      .set({ status: "dismissed", reviewedAt: new Date() })
      .where(eq(triageQueue.id, id))
    return NextResponse.json({ ok: true })
  }

  if (body.action === "push_to_context") {
    await db.update(triageQueue)
      .set({ status: "pushed_to_context", reviewedAt: new Date() })
      .where(eq(triageQueue.id, id))

    await db.insert(lifeContextItems).values({
      userId: session.user.id,
      title: item.title,
      description: item.snippet,
      urgency: item.aiScore >= 80 ? "critical" : "active",
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
```

**Step 3: Verify both routes exist**

```bash
ls src/app/api/triage/
```

Expected: `route.ts`, `scan/`, `[id]/`.

**Step 4: Commit**

```bash
git add src/app/api/triage/route.ts src/app/api/triage/[id]/route.ts
git commit -m "feat: triage list and dismiss/push-to-context API routes"
```

---

## Task 7: Todoist projects fetch + approve-to-Todoist route

**Files:**
- Modify: `src/lib/integrations/todoist.ts`
- Create: `src/app/api/triage/[id]/approve/route.ts`
- Create: `src/app/api/todoist/projects/route.ts`

**Step 1: Add fetchProjects and createTaskWithSubtasks to todoist.ts**

In `src/lib/integrations/todoist.ts`, append:

```typescript
export interface TodoistProject {
  id: string
  name: string
  color: string
}

export async function fetchTodoistProjects(userId: string): Promise<{
  projects: TodoistProject[]
  error?: string
}> {
  const token = await getTodoistToken(userId)
  if (!token) return { projects: [], error: "Todoist not connected" }

  const res = await fetch(`${TODOIST_BASE}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return { projects: [], error: `Todoist error: ${res.status}` }

  const data = await res.json() as TodoistProject[]
  return { projects: data }
}

export async function createTodoistTaskWithSubtasks(
  userId: string,
  input: {
    title: string
    projectId: string
    dueDate?: string
    subtasks: string[]
  }
): Promise<{ taskId: string; error?: string }> {
  const token = await getTodoistToken(userId)
  if (!token) return { taskId: "", error: "Todoist not connected" }

  // Create parent task
  const parentRes = await fetch(`${TODOIST_BASE}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: input.title,
      project_id: input.projectId,
      ...(input.dueDate ? { due_date: input.dueDate } : {}),
    }),
  })

  if (!parentRes.ok) {
    return { taskId: "", error: `Failed to create task: ${parentRes.status}` }
  }

  const parent = await parentRes.json() as { id: string }

  // Create subtasks in sequence (Todoist requires parent_id)
  for (const subtask of input.subtasks) {
    await fetch(`${TODOIST_BASE}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: subtask,
        project_id: input.projectId,
        parent_id: parent.id,
      }),
    })
  }

  return { taskId: parent.id }
}
```

**Step 2: Create projects API route**

Create `src/app/api/todoist/projects/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { fetchTodoistProjects } from "@/lib/integrations/todoist"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projects, error } = await fetchTodoistProjects(session.user.id)
  if (error) return NextResponse.json({ error }, { status: 400 })

  return NextResponse.json({ projects })
}
```

**Step 3: Create the approve route**

Create `src/app/api/triage/[id]/approve/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { triageQueue } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { createTodoistTaskWithSubtasks } from "@/lib/integrations/todoist"
import Anthropic from "@anthropic-ai/sdk"

interface ApproveBody {
  title: string
  projectId: string
  dueDate?: string
  subtasks: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as ApproveBody

  const rows = await db
    .select()
    .from(triageQueue)
    .where(and(eq(triageQueue.id, id), eq(triageQueue.userId, session.user.id)))
    .limit(1)

  const item = rows[0]
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { taskId, error } = await createTodoistTaskWithSubtasks(session.user.id, {
    title: body.title,
    projectId: body.projectId,
    dueDate: body.dueDate,
    subtasks: body.subtasks,
  })

  if (error) return NextResponse.json({ error }, { status: 400 })

  await db.update(triageQueue)
    .set({ status: "approved", reviewedAt: new Date(), todoistTaskId: taskId })
    .where(eq(triageQueue.id, id))

  return NextResponse.json({ taskId })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const rows = await db
    .select()
    .from(triageQueue)
    .where(and(eq(triageQueue.id, id), eq(triageQueue.userId, session.user.id)))
    .limit(1)

  const item = rows[0]
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Generate subtask suggestions via Haiku
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ subtasks: [] })

  const client = new Anthropic({ apiKey })

  const prompt = [
    `For this task, suggest 3-5 concrete subtasks that would help complete it.`,
    `Task: "${item.title}"`,
    `Context: ${item.snippet}`,
    ``,
    `Return JSON only: {"subtasks": ["subtask 1", "subtask 2", ...]}`,
    `Keep each subtask under 60 characters. Be specific and actionable.`,
  ].join("\n")

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    })
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const parsed = JSON.parse(text) as { subtasks: string[] }
    return NextResponse.json({ subtasks: parsed.subtasks ?? [] })
  } catch {
    return NextResponse.json({ subtasks: [] })
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/integrations/todoist.ts \
        src/app/api/todoist/projects/route.ts \
        src/app/api/triage/[id]/approve/route.ts
git commit -m "feat: Todoist project fetch, subtask generation, and approve route"
```

---

## Task 8: Triage page UI

**Files:**
- Create: `src/app/(dashboard)/triage/page.tsx`
- Create: `src/components/triage/triage-card.tsx`
- Create: `src/components/triage/approve-modal.tsx`
- Create: `src/components/triage/triage-empty.tsx`

**Step 1: Create the triage card component**

Create `src/components/triage/triage-card.tsx`:

```typescript
"use client"

import { useState } from "react"
import { CheckCircle2, X, ArrowUpCircle, Mail, Calendar, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SOURCE_ICONS: Record<string, React.ElementType> = {
  gmail: Mail,
  google_calendar: Calendar,
  todoist: CheckSquare,
}

const SOURCE_LABELS: Record<string, string> = {
  gmail: "Gmail",
  google_calendar: "Calendar",
  todoist: "Todoist",
}

export interface TriageItem {
  id: string
  source: string
  title: string
  snippet: string
  aiScore: number
  aiReasoning: string
  createdAt: string
}

interface TriageCardProps {
  item: TriageItem
  onApprove: (item: TriageItem) => void
  onDismiss: (id: string) => void
  onPushToContext: (id: string) => void
}

export function TriageCard({ item, onApprove, onDismiss, onPushToContext }: TriageCardProps) {
  const [loading, setLoading] = useState<"approve" | "dismiss" | "context" | null>(null)
  const SourceIcon = SOURCE_ICONS[item.source] ?? Mail

  async function handleDismiss() {
    setLoading("dismiss")
    await fetch(`/api/triage/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    })
    onDismiss(item.id)
    setLoading(null)
  }

  async function handlePushToContext() {
    setLoading("context")
    await fetch(`/api/triage/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push_to_context" }),
    })
    onPushToContext(item.id)
    setLoading(null)
  }

  const scoreColor = item.aiScore >= 80
    ? "text-destructive"
    : item.aiScore >= 60
    ? "text-amber-500"
    : "text-muted-foreground"

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <SourceIcon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-normal">
              {SOURCE_LABELS[item.source] ?? item.source}
            </Badge>
            <span className={cn("text-xs font-medium", scoreColor)}>
              {item.aiScore}/100
            </span>
          </div>
          <p className="font-medium text-sm leading-snug">{item.title}</p>
          {item.snippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.snippet}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1 italic">
            {item.aiReasoning}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onApprove(item)}
          disabled={loading !== null}
        >
          <CheckCircle2 className="size-3.5 mr-1.5" />
          Add to Todoist
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePushToContext}
          disabled={loading !== null}
        >
          <ArrowUpCircle className="size-3.5 mr-1.5" />
          Context
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          disabled={loading !== null}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Create the approve modal**

Create `src/components/triage/approve-modal.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, X } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { TriageItem } from "./triage-card"

interface Project { id: string; name: string }

interface ApproveModalProps {
  item: TriageItem | null
  onClose: () => void
  onSuccess: (itemId: string, taskId: string) => void
}

export function ApproveModal({ item, onClose, onSuccess }: ApproveModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState("")
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!item) return
    setTitle(item.title)
    setSubtasks([])
    setProjectId("")

    // Fetch projects
    fetch("/api/todoist/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {})

    // Fetch subtask suggestions
    setLoadingSubtasks(true)
    fetch(`/api/triage/${item.id}/approve`)
      .then((r) => r.json())
      .then((d) => setSubtasks(d.subtasks ?? []))
      .catch(() => {})
      .finally(() => setLoadingSubtasks(false))
  }, [item?.id])

  async function handleSubmit() {
    if (!item || !projectId) return
    setSubmitting(true)

    const res = await fetch(`/api/triage/${item.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, projectId, dueDate: dueDate || undefined, subtasks }),
    })

    const data = await res.json() as { taskId?: string; error?: string }
    setSubmitting(false)

    if (data.taskId) {
      onSuccess(item.id, data.taskId)
    }
  }

  function removeSubtask(i: number) {
    setSubtasks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateSubtask(i: number, value: string) {
    setSubtasks((prev) => prev.map((s, idx) => idx === i ? value : s))
  }

  function addSubtask() {
    setSubtasks((prev) => [...prev, ""])
  }

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Todoist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Task title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Due date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Subtasks</Label>
              {loadingSubtasks && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            </div>
            {subtasks.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s}
                  onChange={(e) => updateSubtask(i, e.target.value)}
                  placeholder={`Subtask ${i + 1}`}
                  className="text-sm"
                />
                <Button size="icon" variant="ghost" onClick={() => removeSubtask(i)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addSubtask} className="w-full">
              <Plus className="size-3.5 mr-1.5" />
              Add subtask
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!projectId || submitting}>
            {submitting && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 3: Create the triage page**

Create `src/app/(dashboard)/triage/page.tsx`:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TriageCard, type TriageItem } from "@/components/triage/triage-card"
import { ApproveModal } from "@/components/triage/approve-modal"

export default function TriagePage() {
  const [items, setItems] = useState<TriageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [approveTarget, setApproveTarget] = useState<TriageItem | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/triage?status=pending")
    const data = await res.json() as { items: TriageItem[] }
    setItems(data.items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  async function handleScan() {
    setScanning(true)
    await fetch("/api/triage/scan", { method: "POST" })
    await loadItems()
    setScanning(false)
  }

  function handleDismiss(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function handlePushToContext(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function handleApproveSuccess(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setApproveTarget(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Triage</h1>
          <p className="text-muted-foreground text-sm">
            {items.length} item{items.length !== 1 ? "s" : ""} need your attention
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning
            ? <Loader2 className="size-4 mr-2 animate-spin" />
            : <RefreshCw className="size-4 mr-2" />
          }
          Scan now
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="size-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium">All clear</p>
          <p className="text-sm text-muted-foreground">No items need your attention right now.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleScan}>
            Scan for new items
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TriageCard
              key={item.id}
              item={item}
              onApprove={setApproveTarget}
              onDismiss={handleDismiss}
              onPushToContext={handlePushToContext}
            />
          ))}
        </div>
      )}

      <ApproveModal
        item={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={handleApproveSuccess}
      />
    </div>
  )
}
```

**Step 4: Verify it renders**

```bash
npm run dev
# Navigate to http://localhost:3000/triage
```

Expected: Page loads, shows "0 items" or scanned items.

**Step 5: Commit**

```bash
git add src/app/(dashboard)/triage/ src/components/triage/
git commit -m "feat: triage page UI with cards, approve modal, and scan button"
```

---

## Task 9: Nav badge + sidebar Triage link

**Files:**
- Modify: `src/components/sidebar.tsx`
- Create: `src/app/api/triage/count/route.ts`

**Step 1: Create the badge count API**

Create `src/app/api/triage/count/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { triageQueue } from "@/lib/schema"
import { eq, and, count } from "drizzle-orm"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 })
  }

  const rows = await db
    .select({ count: count() })
    .from(triageQueue)
    .where(and(
      eq(triageQueue.userId, session.user.id),
      eq(triageQueue.status, "pending"),
    ))

  return NextResponse.json({ count: rows[0]?.count ?? 0 })
}
```

**Step 2: Update the sidebar to add Triage nav item with badge**

In `src/components/sidebar.tsx`, update the component to fetch and display the badge:

```typescript
"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { InboxIcon, LayoutDashboard, MapPin, MessageSquare, RotateCcw, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"

const APP_VERSION = "0.1.0"

const STATIC_NAV = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/routines", label: "Routines", icon: RotateCcw },
  { href: "/life-context", label: "Life Context", icon: MapPin },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [triageCount, setTriageCount] = useState(0)

  useEffect(() => {
    fetch("/api/triage/count")
      .then((r) => r.json())
      .then((d) => setTriageCount(d.count ?? 0))
      .catch(() => {})
  }, [pathname]) // Re-fetch on navigation

  const navItems = [
    STATIC_NAV[0],
    { href: "/triage", label: "Triage", icon: InboxIcon, badge: triageCount },
    ...STATIC_NAV.slice(1),
  ]

  return (
    <aside className="hidden md:flex w-56 flex-col border-r px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Image src="/pwa/manifest-icon-192.maskable.png" alt="Clarity" width={28} height={28} className="rounded-md" />
        <span className="font-semibold text-lg">Clarity</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-clarity-amber/15 text-clarity-amber"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {badge != null && badge > 0 && (
              <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground min-w-[18px] text-center">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <Link
        href="/changelog"
        className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
      >
        v{APP_VERSION}
      </Link>
    </aside>
  )
}
```

**Step 3: Verify badge renders**

```bash
npm run dev
```

Expected: Triage link appears in sidebar with a red badge count if items are pending.

**Step 4: Commit**

```bash
git add src/components/sidebar.tsx src/app/api/triage/count/route.ts
git commit -m "feat: triage nav item with pending badge count"
```

---

## Task 10: Wire cron to triage scan + integration smoke test

**Files:**
- Modify: `src/app/api/cron/route.ts` (or wherever the cron handler lives)

**Step 1: Find the cron handler**

```bash
cat src/app/api/cron/route.ts
```

**Step 2: Add triage sync to the cron**

In the cron handler, import and call `syncTriageQueue` for each user with a Google or Todoist integration:

```typescript
import { syncTriageQueue } from "@/lib/triage/sync"
import { db } from "@/lib/db"
import { integrations } from "@/lib/schema"

// Inside the cron handler, after existing syncs:
const userIds = await db
  .selectDistinct({ userId: integrations.userId })
  .from(integrations)

for (const { userId } of userIds) {
  try {
    await syncTriageQueue(userId)
  } catch (err) {
    console.error(`Triage sync failed for ${userId}:`, err)
  }
}
```

**Step 3: End-to-end smoke test**

1. Sign in to Clarity at http://localhost:3000
2. Click "Scan now" on `/triage`
3. Verify items appear with scores and reasoning
4. Dismiss one item — verify it disappears
5. Approve one item — select a project, confirm subtasks, create
6. Open Todoist — verify the task appears with subtasks
7. Push one item to context — navigate to `/life-context` → confirm it appears as a card
8. Check sidebar badge updates after actions

**Step 5: Final commit**

```bash
git add src/app/api/cron/route.ts
git commit -m "feat: add triage sync to daily cron"
```

---

## Phase 1 Complete

After all tasks pass:

```bash
npx vitest run
```

Expected: All tests pass.

```bash
git log --oneline -10
```

Expected output:
```
feat: add triage sync to daily cron
feat: triage nav item with pending badge count
feat: triage page UI with cards, approve modal, and scan button
feat: Todoist project fetch, subtask generation, and approve route
feat: triage list and dismiss/push-to-context API routes
feat: triage sync orchestrator and scan API route
feat: deterministic triage scoring for Todoist and Calendar
feat: Gmail adapter with Haiku urgency scoring
feat: add gmail.readonly scope to Google OAuth
feat: add triage_queue table and schema definition
```

Phases 2-5 are documented in `docs/plans/2026-02-23-life-triage-design.md`.
