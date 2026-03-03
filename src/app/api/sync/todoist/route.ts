import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { syncTodoistTasks } from "@/lib/integrations/todoist"
import { syncRatelimit } from "@/lib/ratelimit"

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = await syncRatelimit.limit(session.user.id)
    if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

    const result = await syncTodoistTasks(session.user.id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ synced: result.synced })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
