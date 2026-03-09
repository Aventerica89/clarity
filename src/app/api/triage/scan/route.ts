import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { syncTriageQueue } from "@/lib/triage/sync"
import { triageScanRatelimit } from "@/lib/ratelimit"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { success } = await triageScanRatelimit.limit(session.user.id)
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 })
    }
  } catch (err) {
    console.warn("[triage/scan] rate limiter unavailable; continuing without limit", err)
  }

  const result = await syncTriageQueue(session.user.id)

  return NextResponse.json(result)
}
