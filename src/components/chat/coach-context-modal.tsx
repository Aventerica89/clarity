"use client"

import { useState } from "react"
import { HelpCircle, Calendar, CheckSquare, Users, BookOpen, TrendingUp, Mail, Brain, Repeat, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const CONTEXT_SOURCES = [
  {
    icon: Calendar,
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

export function CoachContextModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground/50 hover:text-muted-foreground"
          title="What can the coach see?"
        >
          <HelpCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>What the coach can see</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Every message reads fresh context from all your connected sources — nothing is cached between turns.
        </p>

        <div className="space-y-1 mt-1">
          {CONTEXT_SOURCES.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors">
              <Icon className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 mt-1">
          <RefreshCw className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-snug">
            Context is injected fresh on every message. Ask follow-ups freely — the coach always has your latest data.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
