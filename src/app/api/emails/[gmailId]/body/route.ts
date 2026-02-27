import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getAuthenticatedGmailClient } from "@/lib/integrations/gmail"
import type { gmail_v1 } from "googleapis"

type Params = { gmailId: string }

function extractBody(payload: gmail_v1.Schema$MessagePart): { html: string | null; plain: string | null } {
  let html: string | null = null
  let plain: string | null = null

  function decode(data: string): string {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
  }

  function walk(part: gmail_v1.Schema$MessagePart) {
    const mime = part.mimeType ?? ""
    const body = part.body?.data

    if (mime === "text/html" && body && !html) {
      html = decode(body)
    } else if (mime === "text/plain" && body && !plain) {
      plain = decode(body)
    }

    for (const child of part.parts ?? []) {
      walk(child)
    }
  }

  walk(payload)
  return { html, plain }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { gmailId } = await params

  const GMAIL_ID_RE = /^[a-zA-Z0-9_-]{6,32}$/
  if (!GMAIL_ID_RE.test(gmailId)) {
    return NextResponse.json({ error: "Invalid message ID" }, { status: 400 })
  }

  const gmail = await getAuthenticatedGmailClient(session.user.id)
  if (!gmail) {
    return NextResponse.json({ error: "Google not connected" }, { status: 400 })
  }

  let msg
  try {
    const res = await gmail.users.messages.get({
      userId: "me",
      id: gmailId,
      format: "full",
    })
    msg = res.data
  } catch (err: unknown) {
    console.error("[body] Gmail fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch email body" }, { status: 500 })
  }

  if (!msg.payload) {
    return NextResponse.json({ html: null, plain: null })
  }

  const { html, plain } = extractBody(msg.payload)
  return NextResponse.json({ html, plain })
}
