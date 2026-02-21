import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai"

export type ChatMessage = { role: "user" | "assistant"; content: string }

export function createAnthropicClient(token: string): Anthropic {
  return new Anthropic({ apiKey: token })
}

export function createGeminiClient(apiKey: string): GenerativeModel {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        ...messages,
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    const err = new Error(text) as Error & { status: number }
    err.status = res.status
    throw err
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? ""
}

export function callDeepSeek(
  apiKey: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  return callOpenAICompatible(
    "https://api.deepseek.com/v1",
    apiKey,
    "deepseek-chat",
    system,
    messages,
    maxTokens,
  )
}

export function callGroq(
  apiKey: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  return callOpenAICompatible(
    "https://api.groq.com/openai/v1",
    apiKey,
    "llama-3.3-70b-versatile",
    system,
    messages,
    maxTokens,
  )
}
