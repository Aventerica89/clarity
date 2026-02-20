import Anthropic from "@anthropic-ai/sdk"

export function createAnthropicClient(token: string): Anthropic {
  return new Anthropic({ apiKey: token })
}
