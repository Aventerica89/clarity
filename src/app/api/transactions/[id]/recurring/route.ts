import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { transactions } from "@/lib/schema"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Fetch current state to toggle
  const [row] = await db
    .select({ isRecurring: transactions.isRecurring })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user.id),
      ),
    )
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const newValue = !row.isRecurring

  await db
    .update(transactions)
    .set({ isRecurring: newValue, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user.id),
      ),
    )

  return NextResponse.json({ ok: true, isRecurring: newValue })
}
