import Link from "next/link"
import Image from "next/image"
import {
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Settings,
  Zap,
  BookOpen,
  Users,
  TrendingUp,
  Mail,
  Brain,
  Repeat,
  RefreshCw,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageTabs } from "@/components/ui/page-tabs"

const GETTING_STARTED = [
  {
    step: 1,
    title: "Sign in with Google",
    description: "Connects your Google Calendar so events appear in Today.",
    href: "/settings",
    required: true,
  },
  {
    step: 2,
    title: "Connect Todoist",
    description: "Paste your API token to pull tasks into the unified view.",
    href: "/settings",
    required: true,
  },
  {
    step: 3,
    title: "Connect Claude AI",
    description: "Add your Claude.ai token to enable the AI coach.",
    href: "/settings",
    required: false,
  },
  {
    step: 4,
    title: "Review Today",
    description: "Open the dashboard and ask \"What should I do right now?\"",
    href: "/",
    required: true,
  },
  {
    step: 5,
    title: "Build a routine",
    description: "Add a daily habit and start tracking your streak.",
    href: "/routines",
    required: false,
  },
]

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Today View",
    description:
      "Unified timeline of events and tasks across all sources, sorted by time and priority.",
    href: "/",
  },
  {
    icon: Sparkles,
    title: "AI Coach",
    description:
      "Ask what to do next. Claude reads your full context and picks one thing — no lists.",
    href: "/",
  },
  {
    icon: CheckSquare,
    title: "Task Sync",
    description: "Todoist tasks synced daily. Mark complete from the dashboard.",
    href: "/settings",
  },
  {
    icon: CalendarDays,
    title: "Calendar Sync",
    description:
      "Google Calendar events pulled automatically. Apple Calendar via companion app.",
    href: "/settings",
  },
  {
    icon: RotateCcw,
    title: "Routines",
    description:
      "Build recurring habits. Track streaks and see what's scheduled today.",
    href: "/routines",
  },
  {
    icon: Settings,
    title: "Integrations",
    description: "Manage connected accounts, sync status, and AI tokens.",
    href: "/settings",
  },
  {
    icon: Zap,
    title: "Sync on Demand",
    description: "Trigger a manual sync at any time from Settings.",
    href: "/settings",
  },
  {
    icon: BookOpen,
    title: "Changelog",
    description: "See what's new in Clarity with every update.",
    href: "/changelog",
  },
]

const DATA_SOURCES = [
  {
    name: "Google Calendar",
    detail: "OAuth — events sync via API",
  },
  {
    name: "Todoist",
    detail: "API token — tasks sync via REST API",
  },
  {
    name: "Apple Calendar / Reminders",
    detail: "Via Clarity Companion — local Mac process using AppleScript",
  },
]

const COACH_CONTEXT = [
  {
    icon: CalendarDays,
    label: "Upcoming events",
    detail: "Next 3 hours from Google Calendar",
  },
  {
    icon: CheckSquare,
    label: "Tasks",
    detail: "Overdue, due today, and due this week — from Todoist and Google Tasks",
  },
  {
    icon: Repeat,
    label: "Routines",
    detail: "Active habits and today's completion status",
  },
  {
    icon: BookOpen,
    label: "Life context",
    detail: "Active items ranked by urgency — critical, escalated, active, monitoring",
  },
  {
    icon: Users,
    label: "Contacts",
    detail: "Up to 50 Google Contacts for name lookups and enrichment",
  },
  {
    icon: Mail,
    label: "Triage queue",
    detail: "Top 15 pending AI-scored items needing attention",
  },
  {
    icon: TrendingUp,
    label: "Financial snapshot",
    detail: "Bank balance and monthly burn rate (if Plaid is connected)",
  },
  {
    icon: Brain,
    label: "Your profile",
    detail: "Preferences and personal context you've set",
  },
]

export default function GettingStartedPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Image
          src="/pwa/manifest-icon-192.maskable.png"
          alt="Clarity"
          width={28}
          height={28}
          className="rounded-md"
        />
        <h1 className="text-2xl font-bold">Clarity</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        A personal AI productivity hub. Unifies your tasks, calendar, and habits
        into one daily view — with Claude as your focus coach.
      </p>

      <PageTabs
        tabs={[
          {
            value: "getting-started",
            label: "Getting Started",
            content: (
              <Card className="py-0 gap-0 divide-y">
                {GETTING_STARTED.map(
                  ({ step, title, description, href, required }) => (
                    <Link
                      key={step}
                      href={href}
                      className="flex items-center gap-3 py-3 px-4 hover:bg-accent/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {step}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{title}</span>
                          {required && (
                            <Badge
                              variant="outline"
                              className="text-xs py-0 h-4"
                            >
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {description}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0 ml-auto" />
                    </Link>
                  ),
                )}
              </Card>
            ),
          },
          {
            value: "features",
            label: "Features",
            content: (
              <Card className="py-0 gap-0 divide-y">
                {FEATURES.map(({ icon: Icon, title, description, href }) => (
                  <Link
                    key={title}
                    href={href}
                    className="flex items-start gap-3 py-3 px-4 hover:bg-accent/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {description}
                      </p>
                    </div>
                  </Link>
                ))}
              </Card>
            ),
          },
          {
            value: "data-sources",
            label: "Data Sources",
            content: (
              <div className="space-y-4">
                <Card className="py-0 gap-0 divide-y">
                  {DATA_SOURCES.map(({ name, detail }) => (
                    <div
                      key={name}
                      className="flex items-start gap-3 py-3 px-4 text-sm"
                    >
                      <span className="font-medium w-44 shrink-0">{name}</span>
                      <span className="text-muted-foreground">{detail}</span>
                    </div>
                  ))}
                </Card>
                <p className="text-xs text-muted-foreground pt-2">
                  Built with Next.js, Turso, and Claude.{" "}
                  <Link
                    href="/changelog"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Changelog
                  </Link>
                </p>
              </div>
            ),
          },
          {
            value: "ai-coach",
            label: "AI Coach",
            content: (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Every message reads fresh context from all your connected sources — nothing is cached between turns.
                </p>
                <Card className="py-0 gap-0 divide-y">
                  {COACH_CONTEXT.map(({ icon: Icon, label, detail }) => (
                    <div key={label} className="flex items-start gap-3 py-3 px-4">
                      <Icon className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{detail}</p>
                      </div>
                    </div>
                  ))}
                </Card>
                <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
                  <RefreshCw className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground leading-snug">
                    Ask follow-ups freely — the coach always sees your latest data, not a snapshot from the first message.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Open{" "}
                  <Link href="/chat" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    Chat
                  </Link>{" "}
                  and tap the <span className="font-medium">?</span> icon in the input bar to see this at any time.
                </p>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
