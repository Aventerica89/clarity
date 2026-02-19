import Anthropic from "@anthropic-ai/sdk"

/**
 * Creates an Anthropic client that works with both:
 * - Claude.ai OAuth tokens (sk-ant-oat...) → uses authToken
 * - Direct API keys (sk-ant-api...)        → uses apiKey
 */
export function createAnthropicClient(token: string): Anthropic {
  if (token.startsWith("sk-ant-oat")) {
    return new Anthropic({ authToken: token })
  }
  return new Anthropic({ apiKey: token })
}
