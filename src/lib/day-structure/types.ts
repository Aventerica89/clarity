export interface DayStructureTemplate {
  id: string
  name: string
  daysOfWeek: number[]     // 0=Sun..6=Sat
  sleepGoalHours: number   // e.g. 7.0
  wakeTime: string         // "06:00" HH:MM
  prepTimeMins: number
  commuteTimeMins: number
  workStartTime: string | null
  lunchTime: string | null
  dinnerTime: string | null
  windDownMins: number
}

export interface DayStructureAlarm {
  id: string
  templateId: string
  label: string
  time: string             // "08:30" HH:MM
  alarmType: "alarm" | "reminder"
  sortOrder: number
}

export interface DayStructureOverride {
  overrideDate: string     // YYYY-MM-DD
  templateId: string | null
  overridesJson: Record<string, unknown>
}

export interface RoutineChecklist {
  id: string
  name: string
  triggerTimeRef: string   // "bedtime-30" or "wake+0"
  alarmEnabled: boolean
  sortOrder: number
}

export interface ScheduleEntry {
  time: string             // "06:00" HH:MM
  label: string
  type: "alarm" | "reminder" | "checklist_start"
  source: "derived" | "anchor" | "custom" | "checklist"
  checklistId?: string
}

export interface ResolvedSchedule {
  date: string             // YYYY-MM-DD
  templateName: string
  entries: ScheduleEntry[]
  hash: string             // SHA-256 hex
}
