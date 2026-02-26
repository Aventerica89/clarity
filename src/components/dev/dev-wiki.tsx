"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { SettingsTabs } from "@/components/settings/settings-tabs"
import {
  Code,
  Database,
  Globe,
  Layers,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react"

// ── Architecture Tab ─────────────────────────────────────────────────────────

function ArchitectureTab() {
  return (
    <div className="space-y-6">
      <Section title="Stack" icon={Layers}>
        <Table
          rows={[
            ["Web app", "Next.js 16 (App Router, Turbopack)"],
            ["Database", "Turso (LibSQL) via Drizzle ORM"],
            ["Auth", "Better Auth (Google OAuth + email/password)"],
            ["Hosting", "Vercel (Hobby tier)"],
            ["UI", "Tailwind v4 + shadcn/ui + Lucide icons"],
            ["AI", "Claude API (Haiku for scoring, Sonnet for coach)"],
            ["Cron", "GitHub Actions (every 15 min, free)"],
          ]}
        />
      </Section>

      <Section title="Data Flow" icon={Server}>
        <Pre>{`Browser (Vercel) <-> Turso (LibSQL/Drizzle)
                              ^
Google APIs ---------> /api/sync/* routes (cron + manual)
Todoist API ---------> /api/sync/todoist
Gmail API -----------> /api/sync/gmail
Claude API ----------> /api/triage/scan (batch scoring)
Plaid API -----------> /api/webhooks/plaid`}</Pre>
      </Section>

      <Section title="Key Directories" icon={Code}>
        <Table
          rows={[
            ["src/app/(dashboard)/", "Protected app routes (Today, Triage, Calendar, Email, etc.)"],
            ["src/app/api/", "API routes (sync, triage, emails, chat, cron)"],
            ["src/lib/integrations/", "Google Calendar, Gmail, Todoist, Google Tasks adapters"],
            ["src/lib/triage/", "Triage scoring (AI + structured) and sync orchestrator"],
            ["src/lib/sync/", "Master orchestrator that runs all syncs for all users"],
            ["src/components/", "UI components (dashboard, email, triage, settings, etc.)"],
          ]}
        />
      </Section>

      <Section title="Database Tables" icon={Database}>
        <Table
          rows={[
            ["tasks", "Unified tasks from Todoist, manual, routines"],
            ["events", "Calendar events from Google Calendar"],
            ["emails", "Cached Gmail messages (inbox + starred)"],
            ["triage_queue", "AI-scored items pending user review"],
            ["routines / routine_completions", "Recurring habits + daily completions"],
            ["integrations", "Encrypted OAuth tokens per provider"],
            ["coach_messages / chat_sessions", "AI coach conversation history"],
            ["life_context_items", "Free-text situation cards for AI context"],
            ["user_profile", "Bio/work/health context for AI personalization"],
            ["plaid_items / plaid_accounts", "Connected bank accounts"],
            ["financial_snapshot / routine_costs", "Manual finances + recurring expenses"],
          ]}
        />
      </Section>
    </div>
  )
}

// ── Sync System Tab ──────────────────────────────────────────────────────────

function SyncTab() {
  return (
    <div className="space-y-6">
      <Section title="How Sync Works" icon={RefreshCw}>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Sync runs in two ways: the <Strong>header sync button</Strong> (manual, user-initiated)
            and a <Strong>GitHub Actions cron</Strong> (every 15 min, automatic).
          </p>
          <p>
            Both call the same orchestrator at{" "}
            <Mono>/api/cron/sync</Mono> which loops through all users
            and runs every sync in parallel.
          </p>
        </div>
      </Section>

      <Section title="Sync Endpoints" icon={Globe}>
        <Table
          rows={[
            ["/api/sync/google-calendar", "Fetches next 7 days of events, upserts into events table"],
            ["/api/sync/todoist", "Pulls all active tasks, upserts into tasks table"],
            ["/api/sync/gmail", "Fetches 25 inbox + 25 starred, upserts into emails table"],
            ["/api/triage/scan", "Scores Gmail (Haiku AI), Todoist, Calendar, Google Tasks for triage"],
          ]}
        />
      </Section>

      <Section title="Cron Architecture" icon={Zap}>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <Strong>Why GitHub Actions instead of Vercel Cron?</Strong>{" "}
            Vercel Hobby only allows 1 daily cron. Vercel Pro is $20/mo.
            GitHub Actions gives 2,000 free minutes/month.
          </p>
          <p>
            The workflow at <Mono>.github/workflows/sync-cron.yml</Mono>{" "}
            fires every 15 min and POSTs to the cron endpoint with a{" "}
            <Mono>CRON_SECRET</Mono> bearer token.
          </p>
          <p>
            The orchestrator at <Mono>src/lib/sync/orchestrator.ts</Mono>{" "}
            runs Google Calendar, Todoist, Gmail, and Plaid syncs in parallel,
            then runs triage scoring (which needs fresh source data).
          </p>
        </div>
      </Section>

      <Section title="Gmail Scoring (Triage)" icon={Zap}>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Triage scan sends Gmail messages to <Strong>Claude Haiku</Strong>{" "}
            for urgency scoring (0-100). Only emails scoring 60+ enter the triage queue.
          </p>
          <p>
            Scoring is batched 5 at a time to avoid Anthropic rate limits (429).
            Only the 25 most recent inbox emails are scored per sync.
          </p>
          <p>
            Todoist, Calendar, and Google Tasks use <Strong>structured scoring</Strong>{" "}
            (no AI) based on due date, priority, and time proximity.
          </p>
        </div>
      </Section>
    </div>
  )
}

// ── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <Section title="Connected Services" icon={Globe}>
        <div className="space-y-4">
          <IntegrationCard
            name="Google (OAuth)"
            status="live"
            details={[
              "Calendar: read events, sync to events table",
              "Gmail: read messages, sync to emails table + triage scoring",
              "Tasks: read task lists (requires tasks.readonly scope)",
              "Scopes: calendar.readonly, gmail.readonly, tasks.readonly",
            ]}
          />
          <IntegrationCard
            name="Todoist (OAuth)"
            status="live"
            details={[
              "Read all active tasks, sync to tasks table",
              "Write-back: mark tasks complete from Clarity",
              "OAuth flow via /api/auth/todoist/*",
              "Token stored encrypted in integrations table",
            ]}
          />
          <IntegrationCard
            name="Claude AI (API Key)"
            status="live"
            details={[
              "Haiku: batch email scoring in triage (ANTHROPIC_API_KEY)",
              "Sonnet: AI coach in /chat (user-provided key in integrations)",
              "Fallback chain: Anthropic -> DeepSeek -> Gemini",
            ]}
          />
          <IntegrationCard
            name="Plaid (Banking)"
            status="live"
            details={[
              "Link bank accounts via Plaid Link",
              "Sync balances to plaid_accounts table",
              "Webhook at /api/webhooks/plaid",
            ]}
          />
          <IntegrationCard
            name="Google Tasks"
            status="needs-reauth"
            details={[
              "Reads from all task lists (incomplete tasks only)",
              "Structural scoring (due date based, no AI)",
              "Requires sign out + sign in to grant tasks.readonly scope",
            ]}
          />
        </div>
      </Section>
    </div>
  )
}

// ── Shipped Tab ──────────────────────────────────────────────────────────────

function ShippedTab() {
  return (
    <div className="space-y-6">
      <ShippedSection
        date="Feb 24, 2026"
        items={[
          "Gmail sync to DB (emails table) with starred flag",
          "GitHub Actions cron every 15 min (free, replaces Vercel Pro)",
          "Gmail added to sync orchestrator",
          "Triage scoring throttled to batches of 5 (fixes Anthropic 429s)",
          "Email page reads from DB cache (instant load)",
          "Header sync button runs 4 syncs in parallel (triage + cal + todoist + gmail)",
          "Calendar page with events grouped by date",
          "Email page with Starred + Recent sections",
          "Email action buttons: Add to Todoist, Push to Life Context",
          "Google Tasks integration (scope, adapter, structured scoring, triage card)",
          "Sonner toast library for sync feedback",
          "PWA update banner dismiss button + fallback reload",
        ]}
      />
      <ShippedSection
        date="Feb 23, 2026"
        items={[
          "Todoist OAuth flow (end-to-end)",
          "Task checkboxes with Todoist write-back",
          "AI coach fallback chain (Anthropic -> DeepSeek -> Gemini)",
          "Coach identity fix (no longer claims to be GPT-4)",
        ]}
      />
      <ShippedSection
        date="Feb 22, 2026"
        items={[
          "PWA icons and splash screens (pwa-asset-generator)",
          "iOS keyboard fix (h-screen -> h-dvh)",
          "Sidebar logo with app icon",
        ]}
      />
      <ShippedSection
        date="Feb 21, 2026"
        items={[
          "Design system audit (amber-scarce, oklch tokens, flush sidebar)",
          "Interface design system saved to .interface-design/system.md",
          "GitHub Actions: auto-update URLsToGo preview link on deploy",
          "Coach messages + chat sessions tables",
          "6 prompt-kit components for chat UI",
          "Dashboard audit: nav tint, priority tokens, touch targets, layout",
        ]}
      />
    </div>
  )
}

// ── Roadmap Tab ──────────────────────────────────────────────────────────────

function RoadmapTab() {
  return (
    <div className="space-y-6">
      <RoadmapSection
        title="Up Next"
        items={[
          { text: "AI coach tool use (create/complete/reschedule tasks in Todoist)", priority: "high" },
          { text: "Task view improvements (filters, sorting, bulk actions)", priority: "high" },
          { text: "Sign out + sign in flow to grant Google Tasks scope", priority: "medium" },
        ]}
      />
      <RoadmapSection
        title="Planned"
        items={[
          { text: "Places/businesses feature (local context for AI)", priority: "medium" },
          { text: "Partner/couples system (shared routines/lists, @AI chat)", priority: "medium" },
          { text: "Real Anthropic streaming for coach responses", priority: "medium" },
          { text: "Apple companion app (Reminders, Calendar, Notes, Mail via AppleScript)", priority: "low" },
          { text: "Expo mobile app (React Native, Phase 5)", priority: "low" },
        ]}
      />
      <RoadmapSection
        title="Ideas"
        items={[
          { text: "Weekly review page (AI summarizes your week)", priority: "low" },
          { text: "Focus mode (one task at a time, pomodoro-ish)", priority: "low" },
          { text: "Email auto-categorization (beyond inbox/starred)", priority: "low" },
          { text: "Notification system (push via PWA)", priority: "low" },
        ]}
      />
    </div>
  )
}

// ── Shared Components ────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <Card className="py-0 gap-0 divide-y">
      {rows.map(([left, right]) => (
        <div key={left} className="flex gap-3 py-2.5 px-4 text-sm">
          <span className="font-mono text-xs text-muted-foreground shrink-0 w-52 pt-0.5">
            {left}
          </span>
          <span className="text-muted-foreground">{right}</span>
        </div>
      ))}
    </Card>
  )
}

function Pre({ children }: { children: string }) {
  return (
    <Card className="p-4">
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre overflow-x-auto">
        {children}
      </pre>
    </Card>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground font-medium">{children}</span>
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
      {children}
    </code>
  )
}

function IntegrationCard({ name, status, details }: {
  name: string
  status: "live" | "needs-reauth" | "planned"
  details: string[]
}) {
  const statusConfig = {
    live: { label: "Live", className: "bg-green-500/15 text-green-600 dark:text-green-400" },
    "needs-reauth": { label: "Needs Reauth", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    planned: { label: "Planned", className: "bg-muted text-muted-foreground" },
  }
  const config = statusConfig[status]

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      </div>
      <ul className="space-y-1">
        {details.map((d, i) => (
          <li key={i} className="text-xs text-muted-foreground flex gap-2">
            <span className="text-muted-foreground/50 shrink-0">-</span>
            {d}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ShippedSection({ date, items }: { date: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="text-xs font-mono">{date}</Badge>
      </div>
      <Card className="py-0 gap-0 divide-y">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 py-2.5 px-4 text-sm">
            <span className="text-green-600 dark:text-green-400 font-mono font-bold shrink-0 mt-0.5">+</span>
            <span className="text-muted-foreground">{item}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

function RoadmapSection({ title, items }: {
  title: string
  items: { text: string; priority: "high" | "medium" | "low" }[]
}) {
  const priorityConfig = {
    high: { label: "High", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
    medium: { label: "Med", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    low: { label: "Low", className: "bg-muted text-muted-foreground" },
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <Card className="py-0 gap-0 divide-y">
        {items.map((item, i) => {
          const config = priorityConfig[item.priority]
          return (
            <div key={i} className="flex items-center gap-3 py-2.5 px-4 text-sm">
              <span className="text-muted-foreground flex-1">{item.text}</span>
              <Badge variant="outline" className={`shrink-0 text-[10px] ${config.className}`}>
                {config.label}
              </Badge>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function DevWiki() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">Dev</h1>
          <Badge variant="outline" className="text-xs font-mono">internal</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Architecture, sync system, integrations, and roadmap.
        </p>
      </div>

      <SettingsTabs
        tabs={[
          { value: "architecture", label: "Architecture", content: <ArchitectureTab /> },
          { value: "sync", label: "Sync", content: <SyncTab /> },
          { value: "integrations", label: "Integrations", content: <IntegrationsTab /> },
          { value: "shipped", label: "Shipped", content: <ShippedTab /> },
          { value: "roadmap", label: "Roadmap", content: <RoadmapTab /> },
        ]}
      />
    </div>
  )
}
