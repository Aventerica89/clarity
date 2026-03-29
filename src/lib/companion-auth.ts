import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { account } from "@/lib/schema"

// Companion routes use CRON_SECRET for auth (same pattern as cron routes).
// Returns the first user's ID since Clarity is a 2-3 user app.
export async function authenticateCompanion(
  request: NextRequest,
): Promise<{ userId: string } | NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "Companion auth not configured" }, { status: 503 })
  }

  const provided = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${cronSecret}`
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)

  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the user ID from the request header or default to first user
  const requestedUserId = request.headers.get("x-companion-user-id")
  if (requestedUserId) {
    return { userId: requestedUserId }
  }

  // Default: first user with an account
  const rows = await db.selectDistinct({ userId: account.userId }).from(account)
  if (rows.length === 0) {
    return NextResponse.json({ error: "No users found" }, { status: 404 })
  }

  return { userId: rows[0].userId }
}
