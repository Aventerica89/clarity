import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildContext, getAnthropicToken } from "@/lib/ai/coach"
import { createAnthropicClient } from "@/lib/ai/client"
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts"

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = await getAnthropicToken(session.user.id)
    if (!token) {
      return NextResponse.json(
        { error: "No Claude.ai token configured. Add your OAuth token in Settings." },
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

    const client = createAnthropicClient(token)

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[coach] error:", err)
    return NextResponse.json({ error: `Coach error: ${msg}` }, { status: 500 })
  }
}
