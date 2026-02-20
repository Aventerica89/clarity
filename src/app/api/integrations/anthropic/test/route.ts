import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getAnthropicToken } from "@/lib/ai/coach"
import { createAnthropicClient } from "@/lib/ai/client"

// GET /api/integrations/anthropic/test — diagnostic endpoint
// Returns token type and a live API test result (no sensitive values exposed)
export async function GET(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Step 1: Is there a token in the DB at all?
  let token: string | null
  try {
    token = await getAnthropicToken(session.user.id)
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: "decrypt",
      error: `Decryption failed — TOKEN_ENCRYPTION_KEY mismatch between where the token was saved and this environment. Delete and re-save your token. (${err instanceof Error ? err.message : String(err)})`,
    })
  }

  if (!token) {
    return NextResponse.json({ ok: false, stage: "lookup", error: "No token stored in database" })
  }

  // Step 2: What does the token look like?
  const prefix = token.slice(0, 14) + "..."
  const isOAuth = token.startsWith("sk-ant-oat")
  const isApiKey = token.startsWith("sk-ant-api")
  const tokenType = isOAuth ? "oauth" : isApiKey ? "apikey" : "unknown"

  // Step 3: Try a real API call
  try {
    const client = createAnthropicClient(token)
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "Say hi" }],
    })
    const reply = msg.content[0]?.type === "text" ? msg.content[0].text : "(no text)"
    return NextResponse.json({
      ok: true,
      tokenType,
      prefix,
      apiCall: "success",
      reply,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      ok: false,
      stage: "api_call",
      tokenType,
      prefix,
      error: msg,
    })
  }
}
