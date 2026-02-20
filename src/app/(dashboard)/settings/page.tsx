import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { ChevronRight, Info } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { account, integrations } from "@/lib/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TodoistConnectForm } from "@/components/settings/todoist-connect-form"
import { AIConnectForm } from "@/components/settings/ai-connect-form"
import { SyncButton } from "@/components/settings/sync-button"

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [googleRows, todoistRows, anthropicRows, geminiRows] = await Promise.all([
    db
      .select({ accessToken: account.accessToken })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
      .limit(1),
    db
      .select({ syncStatus: integrations.syncStatus, lastError: integrations.lastError })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "todoist")))
      .limit(1),
    db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "anthropic")))
      .limit(1),
    db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "gemini")))
      .limit(1),
  ])

  const googleConnected = Boolean(googleRows[0]?.accessToken)
  const todoist = todoistRows[0] ?? null
  const anthropicConnected = anthropicRows.length > 0
  const geminiConnected = geminiRows.length > 0

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
            <Badge
              variant="outline"
              className={googleConnected
                ? "text-green-600 border-green-200 bg-green-50"
                : "text-muted-foreground"}
            >
              {googleConnected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <CardDescription>
            {googleConnected
              ? "Your Google Calendar is connected. Events sync daily."
              : "Sign in with Google to connect your calendar."}
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
            <Badge
              variant="outline"
              className={
                !todoist
                  ? "text-muted-foreground"
                  : todoist.syncStatus === "error"
                    ? "text-red-600 border-red-200 bg-red-50"
                    : "text-green-600 border-green-200 bg-green-50"
              }
            >
              {!todoist ? "Not connected" : todoist.syncStatus === "error" ? "Error" : "Connected"}
            </Badge>
          </div>
          <CardDescription>
            {todoist
              ? "API token saved. Tasks sync daily."
              : "Enter your Todoist API token to sync tasks. Find it in Todoist Settings → Integrations → API token."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {todoist?.lastError && <p className="text-xs text-red-500">{todoist.lastError}</p>}
          <TodoistConnectForm connected={Boolean(todoist)} />
          {todoist && <SyncButton provider="todoist" label="Sync now" />}
        </CardContent>
      </Card>

      {/* Claude AI */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Claude AI</CardTitle>
            <Badge
              variant="outline"
              className={anthropicConnected
                ? "text-green-600 border-green-200 bg-green-50"
                : "text-muted-foreground"}
            >
              {anthropicConnected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <CardDescription>
            {anthropicConnected
              ? "Claude AI API key saved. The coach is active."
              : "Enter your API key from console.anthropic.com to enable the AI coach. Use an sk-ant-api... key, not a Claude.ai OAuth token."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AIConnectForm
            provider="anthropic"
            connected={anthropicConnected}
            label="Anthropic API Key (from console.anthropic.com)"
            placeholder="sk-ant-api..."
          />
        </CardContent>
      </Card>

      {/* Gemini */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Gemini</CardTitle>
            <Badge
              variant="outline"
              className={geminiConnected
                ? "text-green-600 border-green-200 bg-green-50"
                : "text-muted-foreground"}
            >
              {geminiConnected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <CardDescription>
            {geminiConnected
              ? "Gemini API key saved."
              : "Paste your Gemini API key from Google AI Studio."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AIConnectForm
            provider="gemini"
            connected={geminiConnected}
            label="Gemini API Key"
            placeholder="AIza..."
          />
        </CardContent>
      </Card>

      {/* About */}
      <Link href="/settings/about">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">About Clarity</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>Getting started guide, features, and changelog.</CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  )
}
