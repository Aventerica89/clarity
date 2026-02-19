import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { account, integrations } from "@/lib/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TodoistConnectForm } from "@/components/settings/todoist-connect-form"
import { SyncButton } from "@/components/settings/sync-button"

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [googleRows, todoistRows] = await Promise.all([
    db
      .select({ accessToken: account.accessToken, lastSyncedAt: account.updatedAt })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
      .limit(1),
    db
      .select({
        syncStatus: integrations.syncStatus,
        lastSyncedAt: integrations.lastSyncedAt,
        lastError: integrations.lastError,
      })
      .from(integrations)
      .where(
        and(eq(integrations.userId, userId), eq(integrations.provider, "todoist")),
      )
      .limit(1),
  ])

  const googleConnected = Boolean(googleRows[0]?.accessToken)
  const todoist = todoistRows[0] ?? null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your connected integrations.</p>
      </div>

      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Google Calendar</CardTitle>
            {googleConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
          </div>
          <CardDescription>
            {googleConnected
              ? "Your Google Calendar is connected. Events sync daily."
              : "Sign in with Google to connect your calendar. You may need to sign out and sign in again to grant calendar access."}
          </CardDescription>
        </CardHeader>
        {googleConnected && (
          <CardContent>
            <SyncButton provider="google-calendar" label="Sync now" />
          </CardContent>
        )}
      </Card>

      {/* Todoist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Todoist</CardTitle>
            {todoist ? (
              <Badge
                variant="outline"
                className={
                  todoist.syncStatus === "error"
                    ? "text-red-600 border-red-200 bg-red-50"
                    : "text-green-600 border-green-200 bg-green-50"
                }
              >
                {todoist.syncStatus === "error" ? "Error" : "Connected"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
          </div>
          <CardDescription>
            {todoist
              ? "API token saved. Tasks sync daily."
              : "Enter your Todoist API token to sync tasks. Find it in Todoist Settings → Integrations → API token."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {todoist?.lastError && (
            <p className="text-xs text-red-500">{todoist.lastError}</p>
          )}
          <TodoistConnectForm connected={Boolean(todoist)} />
          {todoist && <SyncButton provider="todoist" label="Sync now" />}
        </CardContent>
      </Card>
    </div>
  )
}
