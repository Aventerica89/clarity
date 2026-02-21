import { NextRequest, NextResponse } from "next/server"
import { asc, eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { chatSessions, coachMessages } from "@/lib/schema"

// GET /api/chat/sessions/[id] — load messages for a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify session belongs to user
    const sessionRow = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id)))
      .limit(1)

    if (!sessionRow[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const messages = await db
      .select({ id: coachMessages.id, role: coachMessages.role, content: coachMessages.content })
      .from(coachMessages)
      .where(and(
        eq(coachMessages.userId, session.user.id),
        eq(coachMessages.sessionId, id),
      ))
      .orderBy(asc(coachMessages.createdAt))

    return NextResponse.json({ messages })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/chat/sessions/[id] — delete a session and its messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership before deleting
    const sessionRow = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id)))
      .limit(1)

    if (!sessionRow[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Delete messages first (no cascade in SQLite without FK pragma)
    await db
      .delete(coachMessages)
      .where(and(
        eq(coachMessages.userId, session.user.id),
        eq(coachMessages.sessionId, id),
      ))

    await db
      .delete(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id)))

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/chat/sessions/[id] — rename a session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({})) as { title?: string }
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 100)
      : null

    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 })
    }

    await db
      .update(chatSessions)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id)))

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
