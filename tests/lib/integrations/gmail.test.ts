import { describe, it, expect, vi } from "vitest"
import { scoreGmailMessage, type GmailMessage } from "@/lib/integrations/gmail"

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  },
}))

vi.mock("googleapis", () => ({
  google: { auth: { OAuth2: vi.fn() }, gmail: vi.fn() },
}))

vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn().mockImplementation(async ({ messages }: { messages: { content: string }[] }) => {
    const content = messages[0].content
    const isUrgent = content.includes("Urgent") || content.includes("flagged")
    const score = isUrgent ? 85 : 30
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          score,
          reasoning: isUrgent ? "Urgent action required" : "Low priority content",
        }),
      }],
    }
  })

  class MockAnthropic {
    messages = { create: mockCreate }
  }

  return { default: MockAnthropic }
})

vi.stubEnv("ANTHROPIC_API_KEY", "test-key")

describe("scoreGmailMessage", () => {
  it("returns score and reasoning for a message", async () => {
    const msg: GmailMessage = {
      id: "abc123",
      threadId: "thread1",
      subject: "Urgent: Your account needs attention",
      from: "alerts@bank.com",
      snippet: "Your account has been flagged for unusual activity.",
      date: new Date().toISOString(),
    }

    const result = await scoreGmailMessage(msg)

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.reasoning).toBeTruthy()
    expect(typeof result.reasoning).toBe("string")
  })

  it("returns low score for newsletter-like content", async () => {
    const msg: GmailMessage = {
      id: "def456",
      threadId: "thread2",
      subject: "Your weekly digest is ready",
      from: "newsletter@medium.com",
      snippet: "Top stories this week: React 19 is out...",
      date: new Date().toISOString(),
    }

    const result = await scoreGmailMessage(msg)
    expect(result.score).toBeLessThan(60)
  })
})
