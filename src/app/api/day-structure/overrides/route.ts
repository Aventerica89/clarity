import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq, gte, lte, type SQL } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayStructureOverrides, dayStructureTemplates } from "@/lib/schema"

const createSchema = z.object({
  overrideDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templateId: z.string().uuid().nullable().optional(),
  overridesJson: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  const conditions: SQL[] = [eq(dayStructureOverrides.userId, session.user.id)]
  if (from) conditions.push(gte(dayStructureOverrides.overrideDate, from))
  if (to) conditions.push(lte(dayStructureOverrides.overrideDate, to))

  const rows = await db
    .select()
    .from(dayStructureOverrides)
    .where(and(...conditions))

  return NextResponse.json({ overrides: rows })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  // Validate templateId if provided
  if (parsed.data.templateId) {
    const [template] = await db
      .select({ id: dayStructureTemplates.id })
      .from(dayStructureTemplates)
      .where(
        and(
          eq(dayStructureTemplates.id, parsed.data.templateId),
          eq(dayStructureTemplates.userId, session.user.id),
        ),
      )

    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  // Upsert — replace existing override for same date
  const existing = await db
    .select({ id: dayStructureOverrides.id })
    .from(dayStructureOverrides)
    .where(
      and(
        eq(dayStructureOverrides.userId, session.user.id),
        eq(dayStructureOverrides.overrideDate, parsed.data.overrideDate),
      ),
    )

  if (existing.length > 0) {
    await db
      .update(dayStructureOverrides)
      .set({
        templateId: parsed.data.templateId ?? null,
        overridesJson: JSON.stringify(parsed.data.overridesJson),
      })
      .where(eq(dayStructureOverrides.id, existing[0].id))

    return NextResponse.json({ ok: true })
  }

  const [row] = await db
    .insert(dayStructureOverrides)
    .values({
      userId: session.user.id,
      overrideDate: parsed.data.overrideDate,
      templateId: parsed.data.templateId ?? null,
      overridesJson: JSON.stringify(parsed.data.overridesJson),
    })
    .returning()

  return NextResponse.json({ override: row })
}
