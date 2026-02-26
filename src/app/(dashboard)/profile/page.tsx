import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { userProfile, routineCosts } from "@/lib/schema"
import type { ComponentProps } from "react"
import { ProfileForm } from "@/components/profile/profile-form"
import { RoutineCostsSection } from "@/components/profile/routine-costs-section"
import { SettingsTabs } from "@/components/settings/settings-tabs"

type RoutineCostProp = ComponentProps<typeof RoutineCostsSection>["initial"][number]

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [profileRows, costsRows] = await Promise.all([
    db.select().from(userProfile).where(eq(userProfile.userId, userId)).limit(1),
    db.select().from(routineCosts).where(and(eq(routineCosts.userId, userId), eq(routineCosts.isActive, true))),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Background context the AI coach uses to personalize its advice.
        </p>
      </div>

      <SettingsTabs
        tabs={[
          {
            value: "about",
            label: "About You",
            content: <ProfileForm initial={profileRows[0] ?? null} />,
          },
          {
            value: "costs",
            label: "Routine Costs",
            content: <RoutineCostsSection initial={costsRows as RoutineCostProp[]} />,
          },
        ]}
      />
    </div>
  )
}
