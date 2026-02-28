import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq, inArray } from "drizzle-orm"
import Image from "next/image"
import { ChevronRight, Info } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { account, integrations, plaidItems, plaidAccounts } from "@/lib/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TodoistConnectForm } from "@/components/settings/todoist-connect-form"
import { AIProvidersPanel } from "@/components/settings/ai-providers-panel"
import { SyncButton } from "@/components/settings/sync-button"
import { PlaidConnectionPanel } from "@/components/settings/plaid-connection-panel"
import { SettingsTabs } from "@/components/settings/settings-tabs"
import { OnboardingReset } from "@/components/settings/onboarding-reset"

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [googleRows, todoistRows, anthropicRows, geminiRows, geminiProRows, deepseekRows, groqRows, plaidItemRows] = await Promise.all([
    db
      .select({ accessToken: account.accessToken })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
      .limit(1),
    db
      .select({
        syncStatus: integrations.syncStatus,
        lastError: integrations.lastError,
        config: integrations.config,
        providerAccountId: integrations.providerAccountId,
      })
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
    db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "gemini-pro")))
      .limit(1),
    db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "deepseek")))
      .limit(1),
    db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, "groq")))
      .limit(1),
    db
      .select({
        id: plaidItems.id,
        institutionName: plaidItems.institutionName,
        syncStatus: plaidItems.syncStatus,
        lastSyncedAt: plaidItems.lastSyncedAt,
        lastError: plaidItems.lastError,
      })
      .from(plaidItems)
      .where(eq(plaidItems.userId, userId)),
  ])

  const googleConnected = Boolean(googleRows[0]?.accessToken)
  const todoist = todoistRows[0] ?? null

  let todoistDisplayName: string | null = null
  let todoistConnectionMethod: string | null = null
  if (todoist?.config) {
    try {
      const cfg = JSON.parse(todoist.config) as Record<string, unknown>
      todoistDisplayName = typeof cfg.todoistDisplayName === "string" ? cfg.todoistDisplayName : null
      todoistConnectionMethod = typeof cfg.connectionMethod === "string" ? cfg.connectionMethod : null
    } catch {
      // Malformed config — ignore
    }
  }
  const aiConnected = {
    anthropic: anthropicRows.length > 0,
    gemini: geminiRows.length > 0,
    "gemini-pro": geminiProRows.length > 0,
    deepseek: deepseekRows.length > 0,
    groq: groqRows.length > 0,
  }

  // Batch-fetch all accounts for connected Plaid items in one query
  const plaidItemIds = plaidItemRows.map((i) => i.id)
  const allPlaidAccounts = plaidItemIds.length > 0
    ? await db.select().from(plaidAccounts).where(inArray(plaidAccounts.plaidItemId, plaidItemIds))
    : []

  // Group accounts by plaidItemId (immutable pattern)
  const accountsByItemId = new Map<string, typeof allPlaidAccounts>()
  for (const acct of allPlaidAccounts) {
    const existing = accountsByItemId.get(acct.plaidItemId) ?? []
    accountsByItemId.set(acct.plaidItemId, [...existing, acct])
  }

  // Build the prop for PlaidConnectionPanel
  // IMPORTANT: lastSyncedAt from Drizzle with mode:"timestamp" is a Date object
  // The component expects number | null (unix seconds), so convert:
  const plaidItemsWithAccounts = plaidItemRows.map((item) => ({
    id: item.id,
    institutionName: item.institutionName,
    syncStatus: item.syncStatus,
    lastSyncedAt: item.lastSyncedAt ? Math.floor(item.lastSyncedAt.getTime() / 1000) : null,
    lastError: item.lastError,
    accounts: (accountsByItemId.get(item.id) ?? []).map((acct) => ({
      id: acct.id,
      name: acct.name,
      type: acct.type,
      subtype: acct.subtype,
      currentBalanceCents: acct.currentBalanceCents,
    })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your connected integrations and preferences.</p>
      </div>

      <SettingsTabs
        tabs={[
          {
            value: "integrations",
            label: "Integrations",
            content: (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Image src="/logos/google-logo.svg" alt="" width={20} height={20} />
                        Google Calendar
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={googleConnected
                          ? "text-green-600 dark:text-green-400 border-green-600/20 bg-green-600/5"
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

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Image src="/logos/todoist-icon.svg" alt="" width={20} height={20} />
                        Todoist
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          !todoist
                            ? "text-muted-foreground"
                            : todoist.syncStatus === "error"
                              ? "text-destructive border-destructive/20 bg-destructive/5"
                              : "text-green-600 dark:text-green-400 border-green-600/20 bg-green-600/5"
                        }
                      >
                        {!todoist ? "Not connected" : todoist.syncStatus === "error" ? "Error" : "Connected"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {todoist
                        ? todoistConnectionMethod === "oauth"
                          ? "Connected via OAuth. Tasks sync in real time."
                          : "API token saved. Tasks sync daily."
                        : "Connect your Todoist account to sync tasks automatically."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {todoist?.lastError && <p className="text-xs text-destructive">{todoist.lastError}</p>}
                    <TodoistConnectForm
                      connected={Boolean(todoist)}
                      displayName={todoistDisplayName}
                      connectionMethod={todoistConnectionMethod}
                    />
                    {todoist && <SyncButton provider="todoist" label="Sync now" />}
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            value: "banking",
            label: "Banking",
            content: (
              <PlaidConnectionPanel initialItems={plaidItemsWithAccounts} />
            ),
          },
          {
            value: "ai",
            label: "AI",
            content: (
              <AIProvidersPanel connected={aiConnected} />
            ),
          },
          {
            value: "account",
            label: "Account",
            content: (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card divide-y overflow-hidden">
                  <Link href="/settings/about" className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Info className="size-4 text-muted-foreground shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-medium">About Clarity</p>
                        <p className="text-xs text-muted-foreground">Getting started guide, features, and changelog.</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                  <OnboardingReset />
                </div>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                  {" · "}JBMD Creations, LLC
                </p>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
