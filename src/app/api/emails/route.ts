import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { client } from "@/lib/db"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await client.execute({
    sql: `SELECT gmail_id, thread_id, subject, from_raw, snippet, date
          FROM emails
          WHERE user_id = ? AND is_starred = 0
          ORDER BY created_at DESC
          LIMIT 25`,
    args: [session.user.id],
  })

  const messages = result.rows.map((r) => ({
    id: r.gmail_id as string,
    threadId: r.thread_id as string,
    subject: r.subject as string,
    from: r.from_raw as string,
    snippet: r.snippet as string,
    date: r.date as string,
  }))

  return NextResponse.json({ messages })
}
