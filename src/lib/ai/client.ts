import Anthropic from "@anthropic-ai/sdk"

export function createAnthropicClient(token: string): Anthropic {
  if (token.startsWith("sk-ant-oat")) {
    return new Anthropic({ authToken: token })
  }
  return new Anthropic({ apiKey: token })
}
