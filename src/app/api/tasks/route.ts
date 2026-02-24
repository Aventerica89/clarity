import { NextRequest, NextResponse } from "next/server"
import { and, eq, desc, asc, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get("status") ?? "active"
  const source = searchParams.get("source") ?? "all"
  const priority = searchParams.get("priority") ?? "all"

  const conditions = [eq(tasks.userId, session.user.id)]

  if (status === "active") {
    conditions.push(eq(tasks.isCompleted, false))
  } else if (status === "completed") {
    conditions.push(eq(tasks.isCompleted, true))
  }

  if (source !== "all") {
    conditions.push(eq(tasks.source, source))
  }

  if (priority !== "all") {
    const p = parseInt(priority, 10)
    if (!isNaN(p)) {
      conditions.push(eq(tasks.priorityManual, p))
    }
  }

  const rows = await db
    .select({
      id: tasks.id,
      source: tasks.source,
      sourceId: tasks.sourceId,
      title: tasks.title,
      description: tasks.description,
      dueDate: tasks.dueDate,
      dueTime: tasks.dueTime,
      priorityScore: tasks.priorityScore,
      priorityManual: tasks.priorityManual,
      isCompleted: tasks.isCompleted,
      labels: tasks.labels,
      metadata: tasks.metadata,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(...conditions))
    .orderBy(
      asc(sql`CASE WHEN ${tasks.dueDate} IS NULL THEN 1 ELSE 0 END`),
      asc(tasks.dueDate),
      desc(tasks.priorityManual),
    )
    .limit(200)

  const items = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  }))

  return NextResponse.json({ tasks: items })
}
