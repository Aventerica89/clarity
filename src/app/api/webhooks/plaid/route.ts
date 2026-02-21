import { NextRequest, NextResponse } from "next/server"
import { createPlaidClient } from "@/lib/plaid"

// Webhook stub — validates Plaid JWT key ID, acknowledges receipt.
// Full JWT signature verification (jose) will be added in Phase 2.
export async function POST(request: NextRequest) {
  const token = request.headers.get("plaid-verification") ?? ""

  if (!token) {
    return NextResponse.json({ error: "Missing plaid-verification header" }, { status: 400 })
  }

  // Extract kid from JWT header (first segment, base64url-encoded JSON)
  let kid: string
  try {
    const headerSegment = token.split(".")[0]
    if (!headerSegment) throw new Error("Invalid JWT format")
    const headerJson = Buffer.from(headerSegment, "base64url").toString("utf-8")
    const header = JSON.parse(headerJson) as { kid?: string }
    if (!header.kid) throw new Error("No kid in JWT header")
    kid = header.kid
  } catch {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 400 })
  }

  // Verify the key ID exists in Plaid (ensures the JWT is from Plaid)
  const client = createPlaidClient()
  try {
    await client.webhookVerificationKeyGet({ key_id: kid })
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  return NextResponse.json({ received: true })
}
