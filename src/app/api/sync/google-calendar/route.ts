import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { syncGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { syncRatelimit } from "@/lib/ratelimit"

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      const { success } = await syncRatelimit.limit(session.user.id)
      if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    } catch (err) {
      console.warn("[sync/google-calendar] rate limiter unavailable; continuing without limit", err)
    }

    const result = await syncGoogleCalendarEvents(session.user.id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ synced: result.synced })
  } catch (err) {
    console.error("[api] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
