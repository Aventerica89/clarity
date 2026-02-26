import { NextRequest, NextResponse } from "next/server"
import { and, asc, eq, gte, lte } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayPlans, events, lifeContextItems, lifeContextUpdates } from "@/lib/schema"
import {
  buildContext,
  getAnthropicToken,
  getGeminiToken,
  getDeepSeekToken,
} from "@/lib/ai/coach"
import {
  createAnthropicClient,
  createGeminiClient,
  callDeepSeek,
  type ChatMessage,
} from "@/lib/ai/client"
import { DAY_PLAN_PROMPT } from "@/lib/ai/prompts"

const TIMEZONE = "America/Phoenix"

type ModelChoice = "haiku" | "sonnet"
type ProviderId = "anthropic" | "gemini" | "deepseek"

const FALLBACK_ORDER: ProviderId[] = ["anthropic", "deepseek", "gemini"]

function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date(),
  )
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(d)
}

function dateToUtc(dateStr: string, time: string): Date {
  const offsetMs = 7 * 60 * 60 * 1000
  return new Date(new Date(`${dateStr}T${time}`).getTime() + offsetMs)
}

function isRateLimited(err: unknown): boolean {
  const e = err as { status?: number; message?: string }
  if (e.status === 429) return true
  const msg = (e.message ?? "").toLowerCase()
  return (
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  )
}

function anthropicModelId(choice: ModelChoice): string {
  return choice === "haiku"
    ? "claude-haiku-4-5-20251001"
    : "claude-sonnet-4-6"
}

async function callPlanProvider(
  provider: ProviderId,
  token: string,
  model: ModelChoice,
  messages: ChatMessage[],
): Promise<string> {
  switch (provider) {
    case "anthropic": {
      const client = createAnthropicClient(token)
      const msg = await client.messages.create({
        model: anthropicModelId(model),
        max_tokens: 2000,
        system: DAY_PLAN_PROMPT,
        messages,
      })
      return msg.content[0]?.type === "text" ? msg.content[0].text : ""
    }
    case "gemini": {
      const gemini = createGeminiClient(token)
      const result = await gemini.generateContent({
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        systemInstruction: DAY_PLAN_PROMPT,
        generationConfig: { maxOutputTokens: 2000 },
      })
      return result.response.text()
    }
    case "deepseek":
      return callDeepSeek(token, DAY_PLAN_PROMPT, messages, 2000)
  }
}

async function buildThreeDayEventsBlock(
  userId: string,
  today: string,
): Promise<string> {
  const endDate = addDays(today, 3)
  const start = dateToUtc(today, "00:00:00")
  const end = dateToUtc(endDate, "23:59:59.999")

  const rows = await db
    .select({
      title: events.title,
      startAt: events.startAt,
      endAt: events.endAt,
      location: events.location,
      isAllDay: events.isAllDay,
    })
    .from(events)
    .where(
      and(
        eq(events.userId, userId),
        gte(events.startAt, start),
        lte(events.startAt, end),
      ),
    )
    .orderBy(asc(events.startAt))
    .limit(40)

  if (rows.length === 0) return ""

  const lines: string[] = ["[Events — Next 3 Days]"]
  for (const ev of rows) {
    const dateStr = ev.startAt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: TIMEZONE,
    })
    const timeStr = ev.isAllDay
      ? "all day"
      : ev.startAt.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: TIMEZONE,
        })
    const loc = ev.location ? ` (${ev.location})` : ""
    lines.push(`  - ${dateStr} ${timeStr}: ${ev.title}${loc}`)
  }
  return lines.join("\n")
}

// GET — return cached plan for today
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = todayString()
    const [plan] = await db
      .select()
      .from(dayPlans)
      .where(
        and(
          eq(dayPlans.userId, session.user.id),
          eq(dayPlans.planDate, today),
        ),
      )
      .limit(1)

    if (!plan) {
      return NextResponse.json({ plan: null })
    }

    return NextResponse.json({
      plan: {
        todayPlan: plan.todayPlan,
        horizon: plan.horizon,
        model: plan.model,
        generatedAt: plan.generatedAt,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — generate (or regenerate) today's plan
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      model?: string
    }
    const model: ModelChoice =
      body.model === "haiku" ? "haiku" : "sonnet"

    const userId = session.user.id
    const now = new Date()
    const today = todayString()

    // Build full context + 3-day events in parallel
    const [context, threeDayEvents] = await Promise.all([
      buildContext(userId, now),
      buildThreeDayEventsBlock(userId, today),
    ])

    const fullContext = threeDayEvents
      ? `${context}\n\n${threeDayEvents}`
      : context

    const messages: ChatMessage[] = [
      { role: "user", content: fullContext },
    ]

    // Resolve tokens
    const [anthropicToken, geminiToken, deepseekToken] = await Promise.all([
      getAnthropicToken(userId),
      getGeminiToken(userId),
      getDeepSeekToken(userId),
    ])

    const tokens: Record<ProviderId, string | null> = {
      anthropic: anthropicToken,
      gemini: geminiToken,
      deepseek: deepseekToken,
    }

    const hasAny = Object.values(tokens).some(Boolean)
    if (!hasAny) {
      return NextResponse.json(
        { error: "No AI key configured. Add one in Settings." },
        { status: 422 },
      )
    }

    let text: string | undefined
    for (const pid of FALLBACK_ORDER) {
      const token = tokens[pid]
      if (!token) continue
      try {
        text = await callPlanProvider(pid, token, model, messages)
        break
      } catch (err) {
        const hasMore = FALLBACK_ORDER.slice(
          FALLBACK_ORDER.indexOf(pid) + 1,
        ).some((p) => tokens[p])
        if (isRateLimited(err) && hasMore) continue
        throw err
      }
    }

    if (!text) {
      return NextResponse.json(
        { error: "All AI providers returned no content." },
        { status: 500 },
      )
    }

    // Parse the two sections from the response
    const horizonMatch = text.indexOf("## Next 3 Days")
    const todayPlan =
      horizonMatch > -1 ? text.slice(0, horizonMatch).trim() : text.trim()
    const horizon =
      horizonMatch > -1 ? text.slice(horizonMatch).trim() : ""

    // Upsert into day_plans
    const id = crypto.randomUUID()
    await db
      .insert(dayPlans)
      .values({
        id,
        userId,
        planDate: today,
        todayPlan,
        horizon,
        model,
        generatedAt: now,
        contextSnapshot: fullContext,
      })
      .onConflictDoUpdate({
        target: [dayPlans.userId, dayPlans.planDate],
        set: {
          todayPlan,
          horizon,
          model,
          generatedAt: now,
          contextSnapshot: fullContext,
        },
      })

    // AI addendum: check for critical/escalated items stale 3+ days
    await postAiAddendums(userId, today)

    return NextResponse.json({
      plan: {
        todayPlan,
        horizon,
        model,
        generatedAt: now,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[day-plan] error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function postAiAddendums(
  userId: string,
  today: string,
): Promise<void> {
  // Find active critical/escalated items
  const items = await db
    .select({
      id: lifeContextItems.id,
      title: lifeContextItems.title,
      urgency: lifeContextItems.urgency,
      updatedAt: lifeContextItems.updatedAt,
    })
    .from(lifeContextItems)
    .where(
      and(
        eq(lifeContextItems.userId, userId),
        eq(lifeContextItems.isActive, true),
      ),
    )

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  for (const item of items) {
    if (item.urgency !== "critical" && item.urgency !== "escalated") continue
    if (item.updatedAt > threeDaysAgo) continue

    // Check if AI already posted today for this item
    const existing = await db
      .select({ id: lifeContextUpdates.id })
      .from(lifeContextUpdates)
      .where(
        and(
          eq(lifeContextUpdates.contextItemId, item.id),
          eq(lifeContextUpdates.source, "ai"),
          gte(
            lifeContextUpdates.createdAt,
            new Date(`${today}T00:00:00`),
          ),
        ),
      )
      .limit(1)

    if (existing.length > 0) continue

    const daysSince = Math.floor(
      (Date.now() - item.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
    )
    const label = item.urgency === "critical" ? "CRITICAL" : "ESCALATED"

    await db.insert(lifeContextUpdates).values({
      contextItemId: item.id,
      userId,
      content: `This has been ${label} for ${daysSince} days with no update. Consider prioritizing.`,
      severity: item.urgency,
      source: "ai",
    })
  }
}
