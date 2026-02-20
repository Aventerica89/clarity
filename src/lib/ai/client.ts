import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai"

export function createAnthropicClient(token: string): Anthropic {
  return new Anthropic({ apiKey: token })
}

export function createGeminiClient(apiKey: string): GenerativeModel {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
}
