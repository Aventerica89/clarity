"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle"
import { TriageCard, type TriageItem } from "@/components/triage/triage-card"
import { TriageTable } from "@/components/triage/triage-table"
import { TaskCardEnhanced } from "@/components/tasks/task-card-enhanced"
import { TaskTable } from "@/components/tasks/task-table"
import { EmailCard } from "@/components/email/email-card"
import { EmailTable } from "@/components/email/email-table"
import type { TaskItem } from "@/types/task"

const TRIAGE_SEED: TriageItem[] = [
  {
    id: "triage-1",
    source: "todoist",
    sourceId: "todoist-1",
    title: "Laptop Code",
    snippet: "Text Gema picture of laptop ID",
    aiScore: 95,
    aiReasoning: "Urgent follow-up and direct dependency for ongoing work.",
    createdAt: new Date().toISOString(),
    sourceMetadata: JSON.stringify({ priority: 4 }),
  },
  {
    id: "triage-2",
    source: "gmail",
    sourceId: "gmail-1",
    title: "Client signed SOW, kickoff requested this week",
    snippet: "Can we lock in a kickoff tomorrow and align on delivery milestones?",
    aiScore: 88,
    aiReasoning: "External commitment with time sensitivity and business impact.",
    createdAt: new Date().toISOString(),
    sourceMetadata: "{}",
  },
  {
    id: "triage-3",
    source: "google_calendar",
    sourceId: "cal-1",
    title: "Quarter planning meeting prep",
    snippet: "Collect priorities and draft notes before Friday planning.",
    aiScore: 72,
    aiReasoning: "Important planning block with medium urgency.",
    createdAt: new Date().toISOString(),
    sourceMetadata: "{}",
  },
]

const TASK_SAMPLE: TaskItem = {
  id: "task-1",
  source: "todoist",
  sourceId: "todoist-1",
  title: "Finalize card interaction spec",
  description: "Lock spacing, hierarchy, button order, and compact behavior before rollout.",
  dueDate: new Date().toISOString().slice(0, 10),
  dueTime: null,
  priorityScore: 89,
  priorityManual: 4,
  isCompleted: false,
  isHidden: false,
  labels: "[]",
  metadata: JSON.stringify({ projectName: "Design System" }),
  createdAt: new Date().toISOString(),
}

const EMAIL_SAMPLE = {
  id: "email-1",
  threadId: "thread-1",
  subject: "Contract revision attached",
  from: "Alex Rivera <alex@acme.co>",
  snippet: "Attached the revised version with your requested timeline updates.",
  date: new Date().toISOString(),
  isFavorited: true,
}

export function CardPlayground() {
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [triageItems, setTriageItems] = useState(TRIAGE_SEED)
  const [taskVisible, setTaskVisible] = useState(true)
  const [emailVisible, setEmailVisible] = useState(true)
  const [emailItem, setEmailItem] = useState(EMAIL_SAMPLE)
  const gridClass = useMemo(
    () => (viewMode === "grid3" ? "grid grid-cols-1 xl:grid-cols-3 gap-3" : "grid grid-cols-1 lg:grid-cols-2 gap-4"),
    [viewMode],
  )

  function resetAll() {
    setTriageItems(TRIAGE_SEED)
    setTaskVisible(true)
    setEmailVisible(true)
    setEmailItem(EMAIL_SAMPLE)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">Card Playground</h1>
            <Badge variant="outline" className="text-xs font-mono">internal</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Tune card layouts before shipping.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle pageKey="dev-cards" value={viewMode} onChange={setViewMode} />
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="size-3.5 mr-1.5" />
            Reset
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/triage">Open Triage</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="triage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="triage">Triage</TabsTrigger>
          <TabsTrigger value="task">Task</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        <TabsContent value="triage">
          {viewMode === "table" ? (
            <TriageTable
              items={triageItems}
              onApprove={(approved) => setTriageItems((prev) => prev.filter((i) => i.id !== approved.id))}
              onDismiss={(id) => setTriageItems((prev) => prev.filter((i) => i.id !== id))}
              onPushToContext={(id) => setTriageItems((prev) => prev.filter((i) => i.id !== id))}
              onComplete={(id) => setTriageItems((prev) => prev.filter((i) => i.id !== id))}
            />
          ) : (
            <div className={gridClass}>
              {triageItems.map((item) => (
                <TriageCard
                  key={item.id}
                  item={item}
                  variant={viewMode === "grid3" ? "compact" : "comfortable"}
                  preview
                  onApprove={(approved) => setTriageItems((prev) => prev.filter((i) => i.id !== approved.id))}
                  onDismiss={(id) => setTriageItems((prev) => prev.filter((i) => i.id !== id))}
                  onPushToContext={(id) => setTriageItems((prev) => prev.filter((i) => i.id !== id))}
                  onComplete={(id) => setTriageItems((prev) => prev.filter((i) => i.id !== id))}
                />
              ))}
            </div>
          )}
          {triageItems.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              No preview cards left. Press reset.
            </div>
          )}
        </TabsContent>

        <TabsContent value="task">
          {!taskVisible ? (
            <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              Task preview dismissed. Press reset.
            </div>
          ) : viewMode === "table" ? (
            <TaskTable tasks={[TASK_SAMPLE]} onComplete={() => setTaskVisible(false)} onHide={() => setTaskVisible(false)} />
          ) : (
            <TaskCardEnhanced
              task={TASK_SAMPLE}
              onComplete={async () => setTaskVisible(false)}
              onHide={async () => setTaskVisible(false)}
            />
          )}
        </TabsContent>

        <TabsContent value="email">
          {!emailVisible ? (
            <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              Email preview archived. Press reset.
            </div>
          ) : viewMode === "table" ? (
            <EmailTable
              messages={[emailItem]}
              onArchive={() => setEmailVisible(false)}
              onFavoriteToggle={(_, favorited) => setEmailItem((prev) => ({ ...prev, isFavorited: favorited }))}
              onAddTodoist={() => {}}
              onPushContext={() => {}}
            />
          ) : (
            <EmailCard
              message={emailItem}
              variant={viewMode === "grid3" ? "compact" : "comfortable"}
              preview
              onArchived={() => setEmailVisible(false)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
