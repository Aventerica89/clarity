import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { contextPins } from "@/lib/schema"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pinId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { pinId } = await params

  const [deleted] = await db
    .delete(contextPins)
    .where(
      and(
        eq(contextPins.id, pinId),
        eq(contextPins.userId, session.user.id),
      ),
    )
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: "Pin not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
