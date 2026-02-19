import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { createAnthropicClient } from "@/lib/ai/client"
import { buildContext, getAnthropicToken } from "@/lib/ai/coach"
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await getAnthropicToken(session.user.id)
  if (!token) {
    return NextResponse.json({ error: "No Claude AI token configured. Add it in Settings." }, { status: 422 })
  }

  const body = await request.json().catch(() => ({})) as { question?: string }
  const question = typeof body.question === "string" && body.question.trim()
    ? body.question.trim()
    : "What should I do right now?"

  const now = new Date()
  const context = await buildContext(session.user.id, now)

  const anthropic = createAnthropicClient(token)

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: COACH_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is my current context:\n\n${context}\n\n${question}`,
      },
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text))
        }
      }
      controller.close()
    },
    async cancel() {
      await stream.abort()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
