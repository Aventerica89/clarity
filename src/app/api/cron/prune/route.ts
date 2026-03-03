import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { coachMessages, emails, triageQueue } from "@/lib/schema"
import { and, eq, lt, or } from "drizzle-orm"

// Retention windows
const COACH_MESSAGES_DAYS = 90
const TRIAGE_RESOLVED_DAYS = 30
const EMAILS_DAYS = 60

function daysAgoTimestamp(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

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

  const coachCutoff = daysAgoTimestamp(COACH_MESSAGES_DAYS)
  const triageCutoff = daysAgoTimestamp(TRIAGE_RESOLVED_DAYS)
  const emailCutoff = daysAgoTimestamp(EMAILS_DAYS)

  const [coachResult, triageResult, emailResult] = await Promise.allSettled([
    // Delete coach messages older than 90 days
    db
      .delete(coachMessages)
      .where(lt(coachMessages.createdAt, coachCutoff)),

    // Delete dismissed/approved triage items older than 30 days
    db
      .delete(triageQueue)
      .where(
        and(
          or(
            eq(triageQueue.status, "dismissed"),
            eq(triageQueue.status, "approved"),
            eq(triageQueue.status, "pushed_to_context"),
          ),
          lt(triageQueue.createdAt, triageCutoff),
        ),
      ),

    // Delete non-starred, non-favorited emails older than 60 days
    db
      .delete(emails)
      .where(
        and(
          eq(emails.isStarred, false),
          eq(emails.isFavorited, false),
          lt(emails.createdAt, emailCutoff),
        ),
      ),
  ])

  return NextResponse.json({
    coachMessages: coachResult.status === "fulfilled" ? "ok" : coachResult.reason,
    triage: triageResult.status === "fulfilled" ? "ok" : triageResult.reason,
    emails: emailResult.status === "fulfilled" ? "ok" : emailResult.reason,
  })
}
