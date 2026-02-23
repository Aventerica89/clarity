import { NextRequest, NextResponse } from "next/server"
import { asc, desc, eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { chatSessions, coachMessages } from "@/lib/schema"
import { buildContext, getAnthropicToken, getGeminiToken, getDeepSeekToken, getGroqToken } from "@/lib/ai/coach"
import { createAnthropicClient, createGeminiClient, callDeepSeek, callGroq, type ChatMessage } from "@/lib/ai/client"
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts"

type ProviderId = "anthropic" | "gemini" | "deepseek" | "groq"

// Auto fallback priority: best quality first, quota-prone last
const FALLBACK_ORDER: ProviderId[] = ["anthropic", "deepseek", "gemini"]

function isRateLimited(err: unknown): boolean {
  const e = err as { status?: number; message?: string }
  if (e.status === 429) return true
  const msg = (e.message ?? "").toLowerCase()
  return msg.includes("quota") || msg.includes("rate limit") || msg.includes("too many requests")
}

async function callProvider(
  provider: ProviderId,
  token: string,
  messages: ChatMessage[],
): Promise<string> {
  switch (provider) {
    case "anthropic": {
      const client = createAnthropicClient(token)
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: COACH_SYSTEM_PROMPT,
        messages,
      })
      return msg.content[0]?.type === "text" ? msg.content[0].text : ""
    }
    case "gemini": {
      const model = createGeminiClient(token)
      const result = await model.generateContent({
        contents: messages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        systemInstruction: COACH_SYSTEM_PROMPT,
        generationConfig: { maxOutputTokens: 1500 },
      })
      return result.response.text()
    }
    case "deepseek":
      return callDeepSeek(token, COACH_SYSTEM_PROMPT, messages, 1500)
    case "groq":
      return callGroq(token, COACH_SYSTEM_PROMPT, messages, 1500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messages = await db
      .select({
        id: coachMessages.id,
        role: coachMessages.role,
        content: coachMessages.content,
        sessionId: coachMessages.sessionId,
        createdAt: coachMessages.createdAt,
      })
      .from(coachMessages)
      .where(eq(coachMessages.userId, session.user.id))
      .orderBy(asc(coachMessages.createdAt))
      .limit(40)

    return NextResponse.json({ messages })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as {
      question?: string
      provider?: string
      sessionId?: string
      namedSession?: boolean
    }

    const question =
      typeof body.question === "string" && body.question.trim()
        ? body.question.trim()
        : "What should I do right now?"

    const incomingSessionId = typeof body.sessionId === "string" ? body.sessionId : null
    const activeSessionId = incomingSessionId ?? crypto.randomUUID()
    // Whether this sessionId corresponds to a named chat session (vs. the dashboard coach widget)
    const isNamedSession = body.namedSession === true

    const requestedProvider = body.provider as ProviderId | "auto" | undefined
    const useAuto = !requestedProvider || requestedProvider === "auto"

    // History query: scoped to session if named, otherwise global (dashboard widget)
    const historyQuery = isNamedSession && incomingSessionId
      ? db
        .select({ role: coachMessages.role, content: coachMessages.content })
        .from(coachMessages)
        .where(and(
          eq(coachMessages.userId, session.user.id),
          eq(coachMessages.sessionId, incomingSessionId),
        ))
        .orderBy(desc(coachMessages.createdAt))
        .limit(20)
      : db
        .select({ role: coachMessages.role, content: coachMessages.content })
        .from(coachMessages)
        .where(eq(coachMessages.userId, session.user.id))
        .orderBy(desc(coachMessages.createdAt))
        .limit(20)

    // Load tokens, context, and chat history in parallel
    const [anthropicToken, geminiToken, deepseekToken, groqToken, context, historyRows] = await Promise.all([
      getAnthropicToken(session.user.id),
      getGeminiToken(session.user.id),
      getDeepSeekToken(session.user.id),
      getGroqToken(session.user.id),
      buildContext(session.user.id, new Date()),
      historyQuery,
    ])

    const tokens: Record<ProviderId, string | null> = {
      anthropic: anthropicToken,
      gemini: geminiToken,
      deepseek: deepseekToken,
      groq: groqToken,
    }

    const hasAny = Object.values(tokens).some(Boolean)
    if (!hasAny) {
      return NextResponse.json(
        { error: "No AI key configured. Add one in Settings." },
        { status: 422 },
      )
    }

    // Build messages array: context injected fresh on the first user turn
    const contextPrefix = `Here is my current context:\n\n${context}\n\n`
    const history = (historyRows.reverse()) as ChatMessage[]

    let messages: ChatMessage[]
    if (history.length === 0) {
      messages = [{ role: "user", content: `${contextPrefix}${question}` }]
    } else {
      const [firstMsg, ...rest] = history
      const firstWithContext: ChatMessage = firstMsg.role === "user"
        ? { role: "user", content: `${contextPrefix}${firstMsg.content}` }
        : firstMsg
      messages = [...[firstWithContext, ...rest], { role: "user", content: question }]
    }

    let text: string | undefined

    if (!useAuto) {
      const token = tokens[requestedProvider as ProviderId]
      if (!token) {
        return NextResponse.json(
          { error: `No API key saved for ${requestedProvider}. Add it in Settings.` },
          { status: 422 },
        )
      }
      text = await callProvider(requestedProvider as ProviderId, token, messages)
    } else {
      const errors: string[] = []
      for (const pid of FALLBACK_ORDER) {
        const token = tokens[pid]
        if (!token) continue
        try {
          text = await callProvider(pid, token, messages)
          break
        } catch (err) {
          const hasMore = FALLBACK_ORDER.slice(FALLBACK_ORDER.indexOf(pid) + 1).some(p => tokens[p])
          if (isRateLimited(err) && hasMore) {
            errors.push(`${pid}: rate limited`)
            continue
          }
          throw err
        }
      }
    }

    if (!text) {
      return NextResponse.json({ error: "All AI providers returned no content." }, { status: 500 })
    }

    // Persist both turns to DB
    const isFirstMessage = historyRows.length === 0
    await db.insert(coachMessages).values([
      {
        userId: session.user.id,
        sessionId: activeSessionId,
        role: "user",
        content: question,
      },
      {
        userId: session.user.id,
        sessionId: activeSessionId,
        role: "assistant",
        content: text,
      },
    ])

    // Update named chat session: set updatedAt, auto-title on first message
    if (isNamedSession && incomingSessionId) {
      const autoTitle = isFirstMessage
        ? question.slice(0, 60) + (question.length > 60 ? "..." : "")
        : undefined
      await db
        .update(chatSessions)
        .set({
          updatedAt: new Date(),
          ...(autoTitle ? { title: autoTitle } : {}),
        })
        .where(and(
          eq(chatSessions.id, incomingSessionId),
          eq(chatSessions.userId, session.user.id),
        ))
    }

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Session-Id": activeSessionId,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[coach] error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
