import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildContext, getGeminiToken } from "@/lib/ai/coach"
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts"

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const geminiToken = await getGeminiToken(session.user.id)
    if (!geminiToken) {
      return NextResponse.json(
        { error: "No AI provider configured. Add a Gemini API key in Settings." },
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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: COACH_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userContent }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      },
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      throw new Error(`Gemini error ${geminiRes.status}: ${errText}`)
    }

    type GeminiResponse = {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
      }>
    }
    const data = await geminiRes.json() as GeminiResponse
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

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
    console.error("[coach] error:", err)
    return NextResponse.json({ error: `Coach error: ${msg}` }, { status: 500 })
  }
}
