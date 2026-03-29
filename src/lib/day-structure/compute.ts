import type {
  DayStructureTemplate,
  DayStructureAlarm,
  DayStructureOverride,
  RoutineChecklist,
  ScheduleEntry,
  ResolvedSchedule,
} from "./types"

// ─── Time utilities ──────────────────────────────────────────────────────────

function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function formatTime(totalMins: number): string {
  const normalized = ((totalMins % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60)
  const m = normalized % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function subtractMinutes(hhmm: string, mins: number): string {
  return formatTime(parseTime(hhmm) - mins)
}

export function addMinutes(hhmm: string, mins: number): string {
  return formatTime(parseTime(hhmm) + mins)
}

// ─── Time reference resolution ───────────────────────────────────────────────

interface DerivedTimes {
  wake: string
  bedtime: string
  windDown: string
  leave: string | null
}

export function resolveTimeRef(
  ref: string,
  derived: DerivedTimes,
): string | null {
  // Format: "anchor+N" or "anchor-N" where N is minutes
  const match = ref.match(/^(\w+)([+-])(\d+)$/)
  if (!match) return null

  const [, anchor, op, minsStr] = match
  const mins = parseInt(minsStr, 10)

  const anchorMap: Record<string, string | null> = {
    wake: derived.wake,
    bedtime: derived.bedtime,
    windDown: derived.windDown,
    leave: derived.leave,
  }

  const baseTime = anchorMap[anchor]
  if (baseTime == null) return null

  return op === "+" ? addMinutes(baseTime, mins) : subtractMinutes(baseTime, mins)
}

// ─── Schedule computation ────────────────────────────────────────────────────

function applyOverrides(
  template: DayStructureTemplate,
  override: DayStructureOverride | null,
): DayStructureTemplate {
  if (!override) return template

  const overrides = override.overridesJson as Record<string, unknown>
  return {
    ...template,
    ...(overrides.wakeTime != null && { wakeTime: overrides.wakeTime as string }),
    ...(overrides.sleepGoalHours != null && { sleepGoalHours: overrides.sleepGoalHours as number }),
    ...(overrides.prepTimeMins != null && { prepTimeMins: overrides.prepTimeMins as number }),
    ...(overrides.commuteTimeMins != null && { commuteTimeMins: overrides.commuteTimeMins as number }),
    ...(overrides.workStartTime !== undefined && { workStartTime: overrides.workStartTime as string | null }),
    ...(overrides.lunchTime !== undefined && { lunchTime: overrides.lunchTime as string | null }),
    ...(overrides.dinnerTime !== undefined && { dinnerTime: overrides.dinnerTime as string | null }),
    ...(overrides.windDownMins != null && { windDownMins: overrides.windDownMins as number }),
  }
}

function computeDerivedTimes(t: DayStructureTemplate): DerivedTimes {
  const bedtime = subtractMinutes(t.wakeTime, t.sleepGoalHours * 60)
  const windDown = subtractMinutes(bedtime, t.windDownMins)
  const leave =
    t.workStartTime && t.commuteTimeMins > 0
      ? subtractMinutes(t.workStartTime, t.commuteTimeMins)
      : null

  return { wake: t.wakeTime, bedtime, windDown, leave }
}

export function computeDaySchedule(
  template: DayStructureTemplate,
  override: DayStructureOverride | null,
  checklists: RoutineChecklist[],
  customAlarms: DayStructureAlarm[],
  date: string,
): ResolvedSchedule {
  const effective = applyOverrides(template, override)
  const derived = computeDerivedTimes(effective)

  const entries: ScheduleEntry[] = []

  // Anchor entries
  entries.push({ time: derived.wake, label: "Wake up", type: "alarm", source: "anchor" })

  if (effective.lunchTime) {
    entries.push({ time: effective.lunchTime, label: "Lunch", type: "reminder", source: "anchor" })
  }
  if (effective.dinnerTime) {
    entries.push({ time: effective.dinnerTime, label: "Dinner", type: "reminder", source: "anchor" })
  }

  // Derived entries
  entries.push({ time: derived.bedtime, label: "Bedtime", type: "alarm", source: "derived" })
  entries.push({ time: derived.windDown, label: "Wind down", type: "reminder", source: "derived" })

  if (derived.leave) {
    entries.push({ time: derived.leave, label: "Time to leave", type: "alarm", source: "derived" })
    const tenMinWarning = subtractMinutes(derived.leave, 10)
    entries.push({ time: tenMinWarning, label: "10 min before leave", type: "reminder", source: "derived" })
  }

  // Custom alarms
  for (const alarm of customAlarms) {
    entries.push({
      time: alarm.time,
      label: alarm.label,
      type: alarm.alarmType,
      source: "custom",
    })
  }

  // Checklist triggers
  for (const checklist of checklists) {
    const resolvedTime = resolveTimeRef(checklist.triggerTimeRef, derived)
    if (resolvedTime) {
      entries.push({
        time: resolvedTime,
        label: checklist.name,
        type: checklist.alarmEnabled ? "alarm" : "reminder",
        source: "checklist",
        checklistId: checklist.id,
      })
    }
  }

  // Sort by time
  entries.sort((a, b) => a.time.localeCompare(b.time))

  // Compute hash
  const hashInput = JSON.stringify(entries)
  const hash = hashString(hashInput)

  return {
    date,
    templateName: effective.name,
    entries,
    hash,
  }
}

// Simple hash for change detection (not crypto-grade, but deterministic)
function hashString(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash).toString(16).padStart(8, "0")
}
