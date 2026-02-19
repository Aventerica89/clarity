import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { account } from "@/lib/schema"
import { syncAllUsers } from "@/lib/sync/orchestrator"

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
  }))

  return NextResponse.json({ results: summary })
}
