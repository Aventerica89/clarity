import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { triageQueue } from "@/lib/schema"
import { eq, and, count } from "drizzle-orm"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 })
  }

  const rows = await db
    .select({ count: count() })
    .from(triageQueue)
    .where(and(
      eq(triageQueue.userId, session.user.id),
      eq(triageQueue.status, "pending"),
    ))

  return NextResponse.json({ count: rows[0]?.count ?? 0 })
}
