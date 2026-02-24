import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { fetchGmailMessages } from "@/lib/integrations/gmail"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messages, error } = await fetchGmailMessages(session.user.id, 25, "is:starred newer_than:14d")

  if (error) {
    return NextResponse.json({ messages: [], error })
  }

  return NextResponse.json({ messages })
}
