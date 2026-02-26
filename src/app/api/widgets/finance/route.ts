import { NextRequest, NextResponse } from "next/server"
import { and, eq, gte, lte, sql } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { transactions, financialSnapshot } from "@/lib/schema"

const TIMEZONE = "America/Phoenix"

function monthsAgoDate(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d)
}

function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date())
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const type = request.nextUrl.searchParams.get("type")

    // Runway mode: return financial snapshot data
    if (type === "runway") {
      const [snapshot] = await db
        .select()
        .from(financialSnapshot)
        .where(eq(financialSnapshot.userId, userId))
        .limit(1)

      if (!snapshot) {
        return NextResponse.json({ error: "No financial data" }, { status: 404 })
      }

      const months = snapshot.monthlyBurnCents > 0
        ? Math.round((snapshot.bankBalanceCents / snapshot.monthlyBurnCents) * 10) / 10
        : 0

      return NextResponse.json({
        months,
        savingsCents: snapshot.bankBalanceCents,
        burnCents: snapshot.monthlyBurnCents,
      })
    }

    // Finance chart mode: aggregate transactions by month
    const monthsParam = parseInt(request.nextUrl.searchParams.get("months") ?? "6", 10)
    const numMonths = monthsParam === 3 ? 3 : 6
    const startDate = monthsAgoDate(numMonths)
    const endDate = todayString()

    const rows = await db
      .select({
        month: sql<string>`substr(${transactions.date}, 1, 7)`,
        amountCents: transactions.amountCents,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      )

    // Aggregate by month
    const monthMap = new Map<string, { income: number; expense: number }>()

    for (const row of rows) {
      const ym = row.month
      const existing = monthMap.get(ym) ?? { income: 0, expense: 0 }
      // Plaid: positive = outflow (expense), negative = inflow (income)
      if (row.amountCents < 0) {
        existing.income += Math.abs(row.amountCents)
      } else {
        existing.expense += row.amountCents
      }
      monthMap.set(ym, existing)
    }

    // Sort by month and format
    const months = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, data]) => {
        const [, m] = ym.split("-")
        const monthName = new Date(2000, parseInt(m, 10) - 1).toLocaleString("en-US", { month: "short" })
        return {
          month: monthName,
          income: Math.round(data.income / 100),
          expense: Math.round(data.expense / 100),
        }
      })

    const totalIncome = months.reduce((s, m) => s + m.income, 0)
    const totalExpense = months.reduce((s, m) => s + m.expense, 0)
    const count = months.length || 1

    return NextResponse.json({
      months,
      avgIncome: Math.round(totalIncome / count),
      avgExpense: Math.round(totalExpense / count),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
