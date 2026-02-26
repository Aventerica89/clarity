import { NextRequest, NextResponse } from "next/server"
import { and, eq, desc, gte, like, or } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { transactions } from "@/lib/schema"

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const category = searchParams.get("category") ?? "all"
  const account = searchParams.get("account") ?? "all"
  const dateRange = searchParams.get("dateRange") ?? "30d"
  const search = searchParams.get("search") ?? ""
  const recurring = searchParams.get("recurring")
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 500)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)

  const conditions = [eq(transactions.userId, session.user.id)]

  // Date range filter
  if (dateRange !== "all") {
    const days = parseInt(dateRange.replace("d", ""), 10) || 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    conditions.push(gte(transactions.date, cutoffStr))
  }

  // Category filter
  if (category !== "all") {
    conditions.push(eq(transactions.category, category))
  }

  // Account filter (personal/business via accountLabel, or specific accountId)
  if (account !== "all") {
    if (account === "personal" || account === "business") {
      conditions.push(eq(transactions.accountLabel, account))
    } else {
      conditions.push(eq(transactions.accountId, account))
    }
  }

  // Recurring filter
  if (recurring === "true") {
    conditions.push(eq(transactions.isRecurring, true))
  }

  // Search filter (uses Drizzle's like() for proper parameterization)
  if (search.trim()) {
    const pattern = `%${search}%`
    const searchCondition = or(
      like(transactions.name, pattern),
      like(transactions.merchantName, pattern),
    )
    if (searchCondition) {
      conditions.push(searchCondition)
    }
  }

  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amountCents: transactions.amountCents,
      name: transactions.name,
      merchantName: transactions.merchantName,
      category: transactions.category,
      subcategory: transactions.subcategory,
      pending: transactions.pending,
      isRecurring: transactions.isRecurring,
      accountLabel: transactions.accountLabel,
      accountId: transactions.accountId,
      source: transactions.source,
    })
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({ transactions: rows })
}
