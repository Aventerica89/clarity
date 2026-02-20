import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildContext, getAnthropicToken, getGeminiToken } from "@/lib/ai/coach"
import { createAnthropicClient, createGeminiClient } from "@/lib/ai/client"
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts"

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [anthropicToken, geminiToken] = await Promise.all([
      getAnthropicToken(session.user.id),
      getGeminiToken(session.user.id),
    ])

    if (!anthropicToken && !geminiToken) {
      return NextResponse.json(
        { error: "No AI key configured. Add an Anthropic API key or Gemini API key in Settings." },
        { status: 422 },
      )
    }

    const body = await request.json().catch(() => ({})) as { question?: string }
    const question =
      typeof body.question === "string" && body.question.trim()
        ? body.question.trim()
        : "What should I do right now?"

    const now = new Date()
    const context = await buildContext(session.user.id, now)
    const userContent = `Here is my current context:\n\n${context}\n\n${question}`

    let text: string

    if (anthropicToken) {
      const client = createAnthropicClient(anthropicToken)
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: COACH_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      })
      text = message.content[0]?.type === "text" ? message.content[0].text : ""
    } else {
      const model = createGeminiClient(geminiToken!)
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        systemInstruction: COACH_SYSTEM_PROMPT,
        generationConfig: { maxOutputTokens: 300 },
      })
      text = result.response.text()
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
