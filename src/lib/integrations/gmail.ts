import { google } from "googleapis"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { account } from "@/lib/schema"
import Anthropic from "@anthropic-ai/sdk"

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
}

interface TriageScore {
  score: number
  reasoning: string
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
}

async function getGoogleAccount(userId: string) {
  const rows = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1)
  return rows[0] ?? null
}

export async function scoreGmailMessage(msg: GmailMessage): Promise<TriageScore> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set")

  const client = new Anthropic({ apiKey })

  const prompt = [
    `Rate the urgency of this email for a busy professional (0-100).`,
    `0 = newsletter/promotional, 100 = requires action today.`,
    ``,
    `From: ${msg.from}`,
    `Subject: ${msg.subject}`,
    `Preview: ${msg.snippet}`,
    ``,
    `Respond with JSON only: {"score": <number>, "reasoning": "<one sentence>"}`,
  ].join("\n")

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  try {
    const parsed = JSON.parse(text) as { score: number; reasoning: string }
    return {
      score: Math.max(0, Math.min(100, parsed.score)),
      reasoning: parsed.reasoning ?? "Flagged by AI",
    }
  } catch {
    return { score: 50, reasoning: "Could not parse AI response" }
  }
}

const DEFAULT_GMAIL_QUERY = "in:inbox -category:promotions -category:social -category:updates"

export async function getAuthenticatedGmailClient(userId: string) {
  const googleAccount = await getGoogleAccount(userId)
  if (!googleAccount?.accessToken) return null

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: googleAccount.accessToken,
    refresh_token: googleAccount.refreshToken ?? undefined,
    expiry_date: googleAccount.accessTokenExpiresAt?.getTime(),
  })

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, unknown> = {}
      if (tokens.access_token) updates.accessToken = tokens.access_token
      if (tokens.expiry_date) updates.accessTokenExpiresAt = new Date(tokens.expiry_date)
      if (Object.keys(updates).length > 0) {
        await db.update(account).set(updates).where(
          and(eq(account.userId, userId), eq(account.providerId, "google"))
        )
      }
    } catch (err) {
      console.error("[gmail] Failed to persist refreshed token:", err)
    }
  })

  return google.gmail({ version: "v1", auth: oauth2Client })
}

export async function fetchGmailMessages(
  userId: string,
  maxResults = 100,
  query = DEFAULT_GMAIL_QUERY,
): Promise<{
  messages: GmailMessage[]
  error?: string
}> {
  const gmail = await getAuthenticatedGmailClient(userId)
  if (!gmail) {
    return { messages: [], error: "google_not_connected" }
  }

  let listRes
  try {
    listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: query,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes("insufficientPermissions") ||
      msg.includes("Request had insufficient authentication scopes")
    ) {
      return { messages: [], error: "gmail_scope_missing" }
    }
    return { messages: [], error: msg }
  }

  const ids = listRes.data.messages ?? []
  const messages: GmailMessage[] = []

  // Fetch headers in parallel (batches of 10)
  const chunks: (typeof ids[0])[][] = []
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10))

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map((m) =>
        gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        })
      )
    )

    for (const result of results) {
      if (result.status !== "fulfilled") continue
      const msg = result.value.data
      const headers = msg.payload?.headers ?? []
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? ""

      messages.push({
        id: msg.id!,
        threadId: msg.threadId!,
        subject: get("Subject") || "(no subject)",
        from: get("From"),
        snippet: (msg.snippet ?? "").slice(0, 300),
        date: get("Date"),
      })
    }
  }

  return { messages }
}

export async function getGmailProfileHistoryId(userId: string): Promise<string | null> {
  const gmail = await getAuthenticatedGmailClient(userId)
  if (!gmail) return null
  try {
    const res = await gmail.users.getProfile({ userId: "me" })
    return res.data.historyId ?? null
  } catch {
    return null
  }
}

export async function fetchGmailMessagesSince(
  userId: string,
  startHistoryId: string,
): Promise<{
  messages: GmailMessage[]
  newHistoryId: string | null
  error?: string
}> {
  const gmail = await getAuthenticatedGmailClient(userId)
  if (!gmail) return { messages: [], newHistoryId: null, error: "google_not_connected" }

  let historyRes
  try {
    historyRes = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
      labelId: "INBOX",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("410") || msg.includes("startHistoryId")) {
      return { messages: [], newHistoryId: null, error: "history_expired" }
    }
    return { messages: [], newHistoryId: null, error: msg }
  }

  const newHistoryId = historyRes.data.historyId ?? null
  const historyRecords = historyRes.data.history ?? []

  const messageIds = new Set<string>()
  for (const record of historyRecords) {
    for (const added of record.messagesAdded ?? []) {
      if (added.message?.id) messageIds.add(added.message.id)
    }
  }

  if (messageIds.size === 0) return { messages: [], newHistoryId }

  const ids = [...messageIds]
  const messages: GmailMessage[] = []
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10))

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map((msgId) =>
        gmail.users.messages.get({
          userId: "me",
          id: msgId,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        })
      )
    )
    for (const result of results) {
      if (result.status !== "fulfilled") continue
      const msg = result.value.data
      const hdrs = msg.payload?.headers ?? []
      const get = (name: string) => hdrs.find((h) => h.name === name)?.value ?? ""
      messages.push({
        id: msg.id!,
        threadId: msg.threadId!,
        subject: get("Subject") || "(no subject)",
        from: get("From"),
        snippet: (msg.snippet ?? "").slice(0, 300),
        date: get("Date"),
      })
    }
  }

  return { messages, newHistoryId }
}

export async function archiveGmailMessage(
  userId: string,
  gmailId: string,
): Promise<{ ok: boolean; error?: string }> {
  const gmail = await getAuthenticatedGmailClient(userId)
  if (!gmail) {
    return { ok: false, error: "Google not connected" }
  }

  try {
    await gmail.users.messages.modify({
      userId: "me",
      id: gmailId,
      requestBody: { removeLabelIds: ["INBOX"] },
    })
    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}
