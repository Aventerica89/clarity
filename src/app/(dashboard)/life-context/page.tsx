import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems, financialSnapshot } from "@/lib/schema"
import { LifeContextList } from "@/components/life-context/life-context-list"
import { FinancialSnapshotCard } from "@/components/life-context/financial-snapshot-card"
import { SettingsTabs } from "@/components/settings/settings-tabs"

export default async function LifeContextPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [items, snapshotRows] = await Promise.all([
    db
      .select()
      .from(lifeContextItems)
      .where(and(eq(lifeContextItems.userId, userId), eq(lifeContextItems.isActive, true)))
      .orderBy(desc(lifeContextItems.urgency), desc(lifeContextItems.createdAt)),
    db
      .select()
      .from(financialSnapshot)
      .where(eq(financialSnapshot.userId, userId))
      .limit(1),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Life Context</h1>
        <p className="text-muted-foreground text-sm">
          What the coach reads before prioritizing your day.
        </p>
      </div>

      <SettingsTabs
        tabs={[
          {
            value: "context",
            label: "Context Items",
            content: <LifeContextList initialItems={items} />,
          },
          {
            value: "finances",
            label: "Finances",
            content: <FinancialSnapshotCard snapshot={snapshotRows[0] ?? null} />,
          },
        ]}
      />
    </div>
  )
}
