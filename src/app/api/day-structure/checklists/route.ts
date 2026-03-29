import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { routineChecklists } from "@/lib/schema"

const createSchema = z.object({
  name: z.string().min(1).max(200),
  triggerTimeRef: z.string().min(1).max(50),  // e.g. "bedtime-30"
  alarmEnabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(routineChecklists)
    .where(eq(routineChecklists.userId, session.user.id))

  return NextResponse.json({ checklists: rows })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const [row] = await db
    .insert(routineChecklists)
    .values({
      userId: session.user.id,
      name: parsed.data.name,
      triggerTimeRef: parsed.data.triggerTimeRef,
      alarmEnabled: parsed.data.alarmEnabled,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning()

  return NextResponse.json({ checklist: row })
}
