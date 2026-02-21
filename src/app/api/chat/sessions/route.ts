import { NextRequest, NextResponse } from "next/server"
import { asc, desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { chatSessions, coachMessages } from "@/lib/schema"

// GET /api/chat/sessions — list all sessions for the user with preview
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, session.user.id))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(50)

    return NextResponse.json({ sessions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/chat/sessions — create a new session
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as { title?: string }
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "New conversation"

    const [created] = await db
      .insert(chatSessions)
      .values({ userId: session.user.id, title })
      .returning()

    return NextResponse.json({ session: created })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
