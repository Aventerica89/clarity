import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { syncPlaidForUser } from "@/lib/plaid/sync"
import { plaidRatelimit } from "@/lib/ratelimit"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { success } = await plaidRatelimit.limit(session.user.id)
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  try {
    const result = await syncPlaidForUser(session.user.id)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 502 })
  }
}
