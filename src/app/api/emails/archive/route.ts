import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { archiveGmailMessage } from "@/lib/integrations/gmail"
import { client } from "@/lib/db"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as { gmailId?: string }
  if (!body.gmailId) {
    return NextResponse.json({ error: "Missing gmailId" }, { status: 400 })
  }

  const result = await archiveGmailMessage(session.user.id, body.gmailId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Remove from local cache
  await client.execute({
    sql: "DELETE FROM emails WHERE user_id = ? AND gmail_id = ?",
    args: [session.user.id, body.gmailId],
  })

  return NextResponse.json({ ok: true })
}
