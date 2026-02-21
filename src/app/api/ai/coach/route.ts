import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildContext, getAnthropicToken, getGeminiToken, getDeepSeekToken, getGroqToken } from "@/lib/ai/coach"
import { createAnthropicClient, createGeminiClient, callDeepSeek, callGroq } from "@/lib/ai/client"
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts"

type ProviderId = "anthropic" | "gemini" | "deepseek" | "groq"

// Auto fallback priority: best quality first, quota-prone last
const FALLBACK_ORDER: ProviderId[] = ["anthropic", "deepseek", "groq", "gemini"]

function isRateLimited(err: unknown): boolean {
  const e = err as { status?: number; message?: string }
  if (e.status === 429) return true
  const msg = (e.message ?? "").toLowerCase()
  return msg.includes("quota") || msg.includes("rate limit") || msg.includes("too many requests")
}

async function callProvider(
  provider: ProviderId,
  token: string,
  userContent: string,
): Promise<string> {
  switch (provider) {
    case "anthropic": {
      const client = createAnthropicClient(token)
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: COACH_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      })
      return msg.content[0]?.type === "text" ? msg.content[0].text : ""
    }
    case "gemini": {
      const model = createGeminiClient(token)
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        systemInstruction: COACH_SYSTEM_PROMPT,
        generationConfig: { maxOutputTokens: 300 },
      })
      return result.response.text()
    }
    case "deepseek":
      return callDeepSeek(token, COACH_SYSTEM_PROMPT, userContent, 300)
    case "groq":
      return callGroq(token, COACH_SYSTEM_PROMPT, userContent, 300)
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
    }

    const question =
      typeof body.question === "string" && body.question.trim()
        ? body.question.trim()
        : "What should I do right now?"

    const requestedProvider = body.provider as ProviderId | "auto" | undefined
    const useAuto = !requestedProvider || requestedProvider === "auto"

    const [anthropicToken, geminiToken, deepseekToken, groqToken] = await Promise.all([
      getAnthropicToken(session.user.id),
      getGeminiToken(session.user.id),
      getDeepSeekToken(session.user.id),
      getGroqToken(session.user.id),
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

    const now = new Date()
    const context = await buildContext(session.user.id, now)
    const userContent = `Here is my current context:\n\n${context}\n\n${question}`

    let text: string | undefined

    if (!useAuto) {
      // Forced provider
      const token = tokens[requestedProvider as ProviderId]
      if (!token) {
        return NextResponse.json(
          { error: `No API key saved for ${requestedProvider}. Add it in Settings.` },
          { status: 422 },
        )
      }
      text = await callProvider(requestedProvider as ProviderId, token, userContent)
    } else {
      // Auto: try each provider in fallback order, skip on rate limits
      const errors: string[] = []
      for (const pid of FALLBACK_ORDER) {
        const token = tokens[pid]
        if (!token) continue
        try {
          text = await callProvider(pid, token, userContent)
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

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[coach] error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
