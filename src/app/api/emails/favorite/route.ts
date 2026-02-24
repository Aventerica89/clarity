import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { client } from "@/lib/db"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as { gmailId?: string; favorited?: boolean }
  if (!body.gmailId) {
    return NextResponse.json({ error: "Missing gmailId" }, { status: 400 })
  }

  const favorited = body.favorited ?? true

  await client.execute({
    sql: `UPDATE emails SET is_favorited = ?, updated_at = unixepoch()
          WHERE user_id = ? AND gmail_id = ?`,
    args: [favorited ? 1 : 0, session.user.id, body.gmailId],
  })

  return NextResponse.json({ ok: true, favorited })
}
