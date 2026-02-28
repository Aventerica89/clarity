import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { account } from "@/lib/schema"
import { syncAllUsers } from "@/lib/sync/orchestrator"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 })
  }
  const provided = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${cronSecret}`
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Collect all distinct userIds that have a Google account
  const rows = await db.selectDistinct({ userId: account.userId }).from(account)
  const userIds = rows.map((r) => r.userId)

  if (userIds.length === 0) {
    return NextResponse.json({ message: "No users to sync", results: [] })
  }

  const results = await syncAllUsers(userIds)

  const summary = results.map((r) => ({
    userId: r.userId,
    googleSynced: r.google?.synced ?? 0,
    googleError: r.google?.error ?? null,
    todoistSynced: r.todoist?.synced ?? 0,
    todoistError: r.todoist?.error ?? null,
    gmailSynced: r.gmail?.synced ?? 0,
    gmailError: r.gmail?.error ?? null,
    triageAdded: r.triage?.added ?? 0,
    triageSkipped: r.triage?.skipped ?? 0,
    triageErrors: r.triage?.errors ?? [],
  }))

  return NextResponse.json({ results: summary })
}
