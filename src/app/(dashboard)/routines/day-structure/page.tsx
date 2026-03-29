"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScheduleTimeline } from "@/components/day-structure/schedule-timeline"
import { TemplateEditor } from "@/components/day-structure/template-editor"
import { ChecklistCard } from "@/components/day-structure/checklist-card"
import type { ResolvedSchedule } from "@/lib/day-structure/types"

interface TemplateRow {
  id: string
  name: string
  daysOfWeek: string
  sleepGoalHours: number
  wakeTime: string
  prepTimeMins: number
  commuteTimeMins: number
  workStartTime: string | null
  lunchTime: string | null
  dinnerTime: string | null
  windDownMins: number
  isActive: boolean
}

interface AlarmRow {
  id: string
  templateId: string
  label: string
  time: string
  alarmType: string
  sortOrder: number
}

interface ChecklistRow {
  id: string
  name: string
  triggerTimeRef: string
  alarmEnabled: boolean
  sortOrder: number
  isActive: boolean
}

interface ChecklistItemRow {
  id: string
  checklistId: string
  label: string
  sortOrder: number
  isActive: boolean
}

interface CompletionRow {
  id: string
  itemId: string
  completedDate: string
}

function getTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix" }).format(new Date())
}

export default function DayStructurePage() {
  const [schedule, setSchedule] = useState<ResolvedSchedule | null>(null)
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [alarms, setAlarms] = useState<AlarmRow[]>([])
  const [checklists, setChecklists] = useState<ChecklistRow[]>([])
  const [checklistItems, setChecklistItems] = useState<Record<string, ChecklistItemRow[]>>({})
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const today = getTodayDate()

  // Fetch all data on mount
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [scheduleRes, templatesRes, checklistsRes] = await Promise.all([
        fetch("/api/day-structure/today"),
        fetch("/api/day-structure/templates"),
        fetch("/api/day-structure/checklists"),
      ])

      const scheduleData = await scheduleRes.json()
      const templatesData = await templatesRes.json()
      const checklistsData = await checklistsRes.json()

      setSchedule(scheduleData.schedule ?? null)
      setTemplates(templatesData.templates ?? [])
      setChecklists(checklistsData.checklists ?? [])

      // Fetch alarms for each template
      const activeTemplates: TemplateRow[] = templatesData.templates ?? []
      if (activeTemplates.length > 0) {
        const alarmRes = await fetch(
          `/api/day-structure/templates/${activeTemplates[0].id}/alarms`,
        )
        const alarmData = await alarmRes.json()
        setAlarms(alarmData.alarms ?? [])
      }

      // Fetch items + completions for each checklist
      const activeChecklists: ChecklistRow[] = checklistsData.checklists ?? []
      const itemsMap: Record<string, ChecklistItemRow[]> = {}
      const allCompletedIds = new Set<string>()

      await Promise.all(
        activeChecklists.map(async (cl) => {
          const itemsRes = await fetch(`/api/day-structure/checklists/${cl.id}/items`)
          const itemsData = await itemsRes.json()
          itemsMap[cl.id] = itemsData.items ?? []
        }),
      )

      setChecklistItems(itemsMap)

      // TODO: Fetch today's completions when we have a GET completions endpoint
      setCompletedItemIds(allCompletedIds)
    } catch (err) {
      console.error("[day-structure] fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Template CRUD
  const handleSaveTemplate = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      await fetch(`/api/day-structure/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await fetchAll()
    },
    [fetchAll],
  )

  const handleCreateTemplate = useCallback(
    async (data: Record<string, unknown>) => {
      await fetch("/api/day-structure/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await fetchAll()
    },
    [fetchAll],
  )

  // Alarm CRUD
  const handleAddAlarm = useCallback(
    async (templateId: string, data: { label: string; time: string; alarmType: string }) => {
      await fetch(`/api/day-structure/templates/${templateId}/alarms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await fetchAll()
    },
    [fetchAll],
  )

  const handleDeleteAlarm = useCallback(
    async (templateId: string, alarmId: string) => {
      await fetch(`/api/day-structure/templates/${templateId}/alarms/${alarmId}`, {
        method: "DELETE",
      })
      await fetchAll()
    },
    [fetchAll],
  )

  // Checklist CRUD
  const handleCreateChecklist = useCallback(
    async () => {
      const name = checklists.length === 0 ? "Night Routine" : "Morning Routine"
      const triggerTimeRef = checklists.length === 0 ? "bedtime-30" : "wake+0"
      await fetch("/api/day-structure/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, triggerTimeRef, alarmEnabled: true }),
      })
      await fetchAll()
    },
    [checklists.length, fetchAll],
  )

  const handleToggleChecklistAlarm = useCallback(
    async (checklistId: string, enabled: boolean) => {
      await fetch(`/api/day-structure/checklists/${checklistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarmEnabled: enabled }),
      })
      await fetchAll()
    },
    [fetchAll],
  )

  const handleAddChecklistItem = useCallback(
    async (checklistId: string, label: string) => {
      await fetch(`/api/day-structure/checklists/${checklistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      })
      await fetchAll()
    },
    [fetchAll],
  )

  const handleDeleteChecklistItem = useCallback(
    async (checklistId: string, itemId: string) => {
      await fetch(`/api/day-structure/checklists/${checklistId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      await fetchAll()
    },
    [fetchAll],
  )

  const handleToggleCompletion = useCallback(
    async (itemId: string, completed: boolean) => {
      if (completed) {
        await fetch("/api/day-structure/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, completedDate: today }),
        })
        setCompletedItemIds((prev) => new Set([...prev, itemId]))
      } else {
        await fetch("/api/day-structure/completions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, completedDate: today }),
        })
        setCompletedItemIds((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [today],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/routines">
          <Button variant="ghost" size="icon" className="size-8">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Day Structure</h1>
          <p className="text-muted-foreground text-sm">
            Your daily schedule, alarms, and routine checklists.
          </p>
        </div>
      </div>

      {/* Section 1: Today's Schedule */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Today's Schedule</h2>
        {schedule ? (
          <ScheduleTimeline
            entries={schedule.entries}
            templateName={schedule.templateName}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Create a template below to see your schedule.
          </p>
        )}
      </section>

      {/* Section 2: Templates */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Templates</h2>
        <TemplateEditor
          templates={templates}
          onSave={handleSaveTemplate}
          onCreateTemplate={handleCreateTemplate}
          alarms={alarms}
          onAddAlarm={handleAddAlarm}
          onDeleteAlarm={handleDeleteAlarm}
        />
      </section>

      {/* Section 3: Checklists */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Checklists</h2>
          {checklists.length < 4 && (
            <Button variant="outline" size="sm" onClick={handleCreateChecklist}>
              <Plus className="size-4 mr-1" />
              Add checklist
            </Button>
          )}
        </div>

        {checklists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No checklists yet. Add a morning or night routine to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {checklists
              .filter((cl) => cl.isActive)
              .map((cl) => (
                <ChecklistCard
                  key={cl.id}
                  id={cl.id}
                  name={cl.name}
                  triggerTimeRef={cl.triggerTimeRef}
                  alarmEnabled={cl.alarmEnabled}
                  items={checklistItems[cl.id] ?? []}
                  completedItemIds={completedItemIds}
                  onToggleCompletion={handleToggleCompletion}
                  onAddItem={handleAddChecklistItem}
                  onDeleteItem={handleDeleteChecklistItem}
                  onToggleAlarm={handleToggleChecklistAlarm}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
