import { NextRequest, NextResponse } from "next/server"
import { and, eq, gte, lte, desc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks, triageQueue } from "@/lib/schema"

const TIMEZONE = "America/Phoenix"

function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
}

function weekStartString(): string {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const diff = now.getDate() - day
  const start = new Date(now)
  start.setDate(diff)
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(start)
}

function weekEndString(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() + (6 - day)
  const end = new Date(now)
  end.setDate(diff)
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(end)
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const type = request.nextUrl.searchParams.get("type")

    // Triage mode: return top pending triage items
    if (type === "triage") {
      const items = await db
        .select({
          id: triageQueue.id,
          title: triageQueue.title,
          aiScore: triageQueue.aiScore,
          source: triageQueue.source,
        })
        .from(triageQueue)
        .where(
          and(
            eq(triageQueue.userId, userId),
            eq(triageQueue.status, "pending"),
          ),
        )
        .orderBy(desc(triageQueue.aiScore))
        .limit(5)

      return NextResponse.json({ items })
    }

    // Week completion mode
    const today = todayString()
    const weekStart = weekStartString()
    const weekEnd = weekEndString()

    // All tasks due this week (completed or not)
    const weekTasks = await db
      .select({
        isCompleted: tasks.isCompleted,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          gte(tasks.dueDate, weekStart),
          lte(tasks.dueDate, weekEnd),
        ),
      )

    const completed = weekTasks.filter((t) => t.isCompleted).length
    const total = weekTasks.length
    const overdue = weekTasks.filter(
      (t) => !t.isCompleted && t.dueDate !== null && t.dueDate < today,
    ).length
    const remaining = total - completed - overdue

    return NextResponse.json({
      completed,
      total,
      overdue,
      remaining: Math.max(remaining, 0),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
