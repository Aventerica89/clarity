import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { syncTriageQueue } from "@/lib/triage/sync"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await syncTriageQueue(session.user.id)

  return NextResponse.json(result)
}
