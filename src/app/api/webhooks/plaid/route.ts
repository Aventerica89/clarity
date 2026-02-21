import { NextRequest, NextResponse } from "next/server"
import { createPlaidClient } from "@/lib/plaid"

// Webhook stub — validates Plaid signature and acknowledges receipt.
// Real-time processing will be added in Phase 2.
export async function POST(request: NextRequest) {
  const signatureHeader = request.headers.get("plaid-verification") ?? ""

  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing verification header" }, { status: 400 })
  }

  const client = createPlaidClient()
  try {
    await client.webhookVerificationKeyGet({ key_id: signatureHeader })
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  return NextResponse.json({ received: true })
}
