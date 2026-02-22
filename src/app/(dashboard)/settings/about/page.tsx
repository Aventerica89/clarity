import Link from "next/link"
import {
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Settings,
  Zap,
  BookOpen,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SettingsTabs } from "@/components/settings/settings-tabs"

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
    description: "Unified timeline of events and tasks across all sources, sorted by time and priority.",
    href: "/",
  },
  {
    icon: Sparkles,
    title: "AI Coach",
    description: "Ask what to do next. Claude reads your full context and picks one thing — no lists.",
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
    description: "Google Calendar events pulled automatically. Apple Calendar via companion app.",
    href: "/settings",
  },
  {
    icon: RotateCcw,
    title: "Routines",
    description: "Build recurring habits. Track streaks and see what's scheduled today.",
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

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
          <ChevronRight className="size-3.5" />
          <span>About</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="size-6 text-clarity-amber" />
          <h1 className="text-2xl font-bold">Clarity</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          A personal AI productivity hub. Unifies your tasks, calendar, and habits into one
          daily view — with Claude as your focus coach.
        </p>
      </div>

      <SettingsTabs
        tabs={[
          {
            value: "getting-started",
            label: "Getting Started",
            content: (
              <div className="space-y-3">
                {GETTING_STARTED.map(({ step, title, description, href, required }) => (
                  <Link key={step} href={href}>
                    <Card className="py-0 hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="flex items-center gap-3 py-3 px-4">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {step}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{title}</span>
                            {required && (
                              <Badge variant="outline" className="text-xs py-0 h-4">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ),
          },
          {
            value: "features",
            label: "Features",
            content: (
              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map(({ icon: Icon, title, description, href }) => (
                  <Link key={title} href={href}>
                    <Card className="h-full py-0 hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="flex items-start gap-3 py-3 px-3">
                        <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ),
          },
          {
            value: "data-sources",
            label: "Data Sources",
            content: (
              <div className="space-y-4">
                <div className="space-y-2">
                  {DATA_SOURCES.map(({ name, detail }) => (
                    <div key={name} className="flex items-start gap-3 text-sm">
                      <span className="font-medium w-44 shrink-0">{name}</span>
                      <span className="text-muted-foreground">{detail}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Built with Next.js, Turso, and Claude.{" "}
                  <Link href="/changelog" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    Changelog
                  </Link>
                </p>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
