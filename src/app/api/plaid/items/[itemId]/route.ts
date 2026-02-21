import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems } from "@/lib/schema"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params

  const result = await db
    .delete(plaidItems)
    .where(and(eq(plaidItems.id, itemId), eq(plaidItems.userId, session.user.id)))
    .returning({ id: plaidItems.id })

  if (result.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
