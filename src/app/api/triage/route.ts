import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { triageQueue } from "@/lib/schema"
import { eq, and, desc } from "drizzle-orm"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = (searchParams.get("status") ?? "pending") as
    "pending" | "approved" | "dismissed" | "pushed_to_context"

  const items = await db
    .select()
    .from(triageQueue)
    .where(and(
      eq(triageQueue.userId, session.user.id),
      eq(triageQueue.status, status),
    ))
    .orderBy(desc(triageQueue.aiScore), desc(triageQueue.createdAt))
    .limit(50)

  return NextResponse.json({ items })
}
