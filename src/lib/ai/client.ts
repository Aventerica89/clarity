import Anthropic from "@anthropic-ai/sdk"

export function createAnthropicClient(token: string): Anthropic {
  if (token.startsWith("sk-ant-oat")) {
    // OAuth tokens require x-app: cli header — same approach Claude Code uses internally
    return new Anthropic({ authToken: token, defaultHeaders: { "x-app": "cli" } })
  }
  return new Anthropic({ apiKey: token })
}
