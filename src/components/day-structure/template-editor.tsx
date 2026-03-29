"use client"

import { useState, useCallback } from "react"
import { Save, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

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
  label: string
  time: string
  alarmType: string
  sortOrder: number
}

interface TemplateEditorProps {
  templates: TemplateRow[]
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>
  onCreateTemplate: (data: Record<string, unknown>) => Promise<void>
  alarms: AlarmRow[]
  onAddAlarm: (templateId: string, data: { label: string; time: string; alarmType: string }) => Promise<void>
  onDeleteAlarm: (templateId: string, alarmId: string) => Promise<void>
}

export function TemplateEditor({
  templates,
  onSave,
  onCreateTemplate,
  alarms,
  onAddAlarm,
  onDeleteAlarm,
}: TemplateEditorProps) {
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id ?? "")
  const [saving, setSaving] = useState(false)
  const [newAlarmLabel, setNewAlarmLabel] = useState("")
  const [newAlarmTime, setNewAlarmTime] = useState("08:00")

  const activeTemplate = templates.find((t) => t.id === activeTemplateId)
  const templateAlarms = alarms.filter((a) => a.id && activeTemplate?.id)
    .filter((a) => {
      // Filter alarms for the active template
      return true // All alarms are fetched per-template from API
    })

  const handleFieldChange = useCallback(
    async (field: string, value: unknown) => {
      if (!activeTemplate) return
      setSaving(true)
      try {
        await onSave(activeTemplate.id, { [field]: value })
      } finally {
        setSaving(false)
      }
    },
    [activeTemplate, onSave],
  )

  const handleDayToggle = useCallback(
    async (day: number) => {
      if (!activeTemplate) return
      const current: number[] = JSON.parse(activeTemplate.daysOfWeek || "[]")
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort()
      await handleFieldChange("daysOfWeek", next)
    },
    [activeTemplate, handleFieldChange],
  )

  const handleAddAlarm = useCallback(async () => {
    if (!activeTemplate || !newAlarmLabel.trim()) return
    await onAddAlarm(activeTemplate.id, {
      label: newAlarmLabel.trim(),
      time: newAlarmTime,
      alarmType: "alarm",
    })
    setNewAlarmLabel("")
    setNewAlarmTime("08:00")
  }, [activeTemplate, newAlarmLabel, newAlarmTime, onAddAlarm])

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">No templates yet.</p>
          <Button
            size="sm"
            onClick={() =>
              onCreateTemplate({
                name: "Work Day",
                daysOfWeek: [1, 2, 3, 4, 5],
                sleepGoalHours: 7,
                wakeTime: "06:00",
                prepTimeMins: 45,
                commuteTimeMins: 30,
                workStartTime: "07:15",
                lunchTime: "12:00",
                dinnerTime: "18:00",
              })
            }
          >
            <Plus className="size-4 mr-1" />
            Create Work Day template
          </Button>
        </CardContent>
      </Card>
    )
  }

  const daysOfWeek: number[] = activeTemplate
    ? JSON.parse(activeTemplate.daysOfWeek || "[]")
    : []

  return (
    <div className="space-y-4">
      {/* Template selector */}
      <div className="flex gap-2">
        {templates.map((t) => (
          <Button
            key={t.id}
            variant={t.id === activeTemplateId ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTemplateId(t.id)}
          >
            {t.name}
          </Button>
        ))}
        {templates.length < 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onCreateTemplate({
                name: templates.length === 1 ? "Off Day" : "Template",
                daysOfWeek: [0, 6],
                sleepGoalHours: 8,
                wakeTime: "08:00",
                prepTimeMins: 30,
                commuteTimeMins: 0,
                lunchTime: "12:30",
                dinnerTime: "18:30",
              })
            }
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {activeTemplate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {activeTemplate.name}
              {saving && (
                <span className="text-xs text-muted-foreground font-normal">Saving...</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Days of week */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Active days</Label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => handleDayToggle(i)}
                    className={cn(
                      "size-8 rounded-md text-xs font-medium transition-colors",
                      daysOfWeek.includes(i)
                        ? "bg-clarity-amber text-black"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time fields */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="wakeTime" className="text-xs text-muted-foreground">
                  Wake time
                </Label>
                <Input
                  id="wakeTime"
                  type="time"
                  value={activeTemplate.wakeTime}
                  onChange={(e) => handleFieldChange("wakeTime", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sleepGoal" className="text-xs text-muted-foreground">
                  Sleep goal (hours)
                </Label>
                <Input
                  id="sleepGoal"
                  type="number"
                  min={4}
                  max={12}
                  step={0.5}
                  value={activeTemplate.sleepGoalHours}
                  onChange={(e) => handleFieldChange("sleepGoalHours", parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prepTime" className="text-xs text-muted-foreground">
                  Prep time (min)
                </Label>
                <Input
                  id="prepTime"
                  type="number"
                  min={0}
                  max={240}
                  value={activeTemplate.prepTimeMins}
                  onChange={(e) => handleFieldChange("prepTimeMins", parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="commute" className="text-xs text-muted-foreground">
                  Commute (min)
                </Label>
                <Input
                  id="commute"
                  type="number"
                  min={0}
                  max={240}
                  value={activeTemplate.commuteTimeMins}
                  onChange={(e) => handleFieldChange("commuteTimeMins", parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="workStart" className="text-xs text-muted-foreground">
                  Work starts
                </Label>
                <Input
                  id="workStart"
                  type="time"
                  value={activeTemplate.workStartTime ?? ""}
                  onChange={(e) =>
                    handleFieldChange("workStartTime", e.target.value || null)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="windDown" className="text-xs text-muted-foreground">
                  Wind down (min before bed)
                </Label>
                <Input
                  id="windDown"
                  type="number"
                  min={0}
                  max={300}
                  value={activeTemplate.windDownMins}
                  onChange={(e) => handleFieldChange("windDownMins", parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lunch" className="text-xs text-muted-foreground">
                  Lunch
                </Label>
                <Input
                  id="lunch"
                  type="time"
                  value={activeTemplate.lunchTime ?? ""}
                  onChange={(e) => handleFieldChange("lunchTime", e.target.value || null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dinner" className="text-xs text-muted-foreground">
                  Dinner
                </Label>
                <Input
                  id="dinner"
                  type="time"
                  value={activeTemplate.dinnerTime ?? ""}
                  onChange={(e) => handleFieldChange("dinnerTime", e.target.value || null)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Custom alarms */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Custom alarms</Label>
              {alarms.length > 0 && (
                <div className="space-y-1 mb-3">
                  {alarms.map((alarm) => (
                    <div key={alarm.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        {alarm.time}
                      </Badge>
                      <span>{alarm.label}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 ml-auto"
                        onClick={() => onDeleteAlarm(activeTemplate.id, alarm.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newAlarmTime}
                  onChange={(e) => setNewAlarmTime(e.target.value)}
                  className="w-28"
                />
                <Input
                  placeholder="Label (e.g. Take medication)"
                  value={newAlarmLabel}
                  onChange={(e) => setNewAlarmLabel(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddAlarm()}
                />
                <Button size="sm" variant="outline" onClick={handleAddAlarm} disabled={!newAlarmLabel.trim()}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
