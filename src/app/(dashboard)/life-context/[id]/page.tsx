import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { and, desc, eq } from "drizzle-orm"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems, lifeContextUpdates } from "@/lib/schema"
import { fetchPinsForContext } from "@/lib/pins"
import { ContextDetailClient } from "@/components/life-context/context-detail-client"

export default async function ContextItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const { id } = await params

  const [item] = await db
    .select()
    .from(lifeContextItems)
    .where(
      and(
        eq(lifeContextItems.id, id),
        eq(lifeContextItems.userId, session.user.id),
      ),
    )
    .limit(1)

  if (!item) notFound()

  const [updates, pins] = await Promise.all([
    db
      .select()
      .from(lifeContextUpdates)
      .where(
        and(
          eq(lifeContextUpdates.contextItemId, id),
          eq(lifeContextUpdates.userId, session.user.id),
        ),
      )
      .orderBy(desc(lifeContextUpdates.createdAt)),
    fetchPinsForContext(id, session.user.id),
  ])

  return (
    <div className="space-y-6">
      <Link
        href="/life-context"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />
        Life Context
      </Link>

      <ContextDetailClient
        item={{
          id: item.id,
          title: item.title,
          description: item.description,
          urgency: item.urgency,
          isActive: item.isActive,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        }}
        initialUpdates={updates.map((u) => ({
          id: u.id,
          contextItemId: u.contextItemId,
          content: u.content,
          severity: u.severity,
          source: (u.source ?? "user") as "user" | "ai",
          createdAt: u.createdAt.toISOString(),
        }))}
        initialPins={pins}
      />
    </div>
  )
}
