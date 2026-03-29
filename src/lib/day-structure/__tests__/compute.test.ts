import { describe, it, expect } from "vitest"
import { computeDaySchedule, subtractMinutes, addMinutes, resolveTimeRef } from "../compute"
import type { DayStructureTemplate, DayStructureAlarm, DayStructureOverride, RoutineChecklist } from "../types"

const workDayTemplate: DayStructureTemplate = {
  id: "t1",
  name: "Work Day",
  daysOfWeek: [1, 2, 3, 4, 5],
  sleepGoalHours: 7,
  wakeTime: "06:00",
  prepTimeMins: 45,
  commuteTimeMins: 30,
  workStartTime: "07:15",
  lunchTime: "12:00",
  dinnerTime: "18:00",
  windDownMins: 120,
}

const offDayTemplate: DayStructureTemplate = {
  id: "t2",
  name: "Off Day",
  daysOfWeek: [0, 6],
  sleepGoalHours: 8,
  wakeTime: "08:00",
  prepTimeMins: 30,
  commuteTimeMins: 0,
  workStartTime: null,
  lunchTime: "12:30",
  dinnerTime: "18:30",
  windDownMins: 120,
}

// ─── Time utility tests ──────────────────────────────────────────────────────

describe("subtractMinutes", () => {
  it("subtracts within same hour", () => {
    expect(subtractMinutes("06:45", 30)).toBe("06:15")
  })

  it("wraps across midnight", () => {
    expect(subtractMinutes("00:30", 60)).toBe("23:30")
  })

  it("subtracts multiple hours", () => {
    expect(subtractMinutes("23:00", 420)).toBe("16:00") // 7 hours
  })

  it("subtracts exactly to midnight", () => {
    expect(subtractMinutes("01:00", 60)).toBe("00:00")
  })
})

describe("addMinutes", () => {
  it("adds within same hour", () => {
    expect(addMinutes("06:00", 30)).toBe("06:30")
  })

  it("wraps across midnight", () => {
    expect(addMinutes("23:30", 60)).toBe("00:30")
  })

  it("adds zero minutes", () => {
    expect(addMinutes("12:00", 0)).toBe("12:00")
  })
})

describe("resolveTimeRef", () => {
  const derivedTimes = {
    wake: "06:00",
    bedtime: "23:00",
    windDown: "21:00",
    leave: "06:15",
  }

  it("resolves wake+0", () => {
    expect(resolveTimeRef("wake+0", derivedTimes)).toBe("06:00")
  })

  it("resolves bedtime-30", () => {
    expect(resolveTimeRef("bedtime-30", derivedTimes)).toBe("22:30")
  })

  it("resolves wake+15", () => {
    expect(resolveTimeRef("wake+15", derivedTimes)).toBe("06:15")
  })

  it("resolves windDown+0", () => {
    expect(resolveTimeRef("windDown+0", derivedTimes)).toBe("21:00")
  })

  it("returns null for unknown anchor", () => {
    expect(resolveTimeRef("unknown+0", derivedTimes)).toBeNull()
  })
})

// ─── Schedule computation tests ──────────────────────────────────────────────

describe("computeDaySchedule", () => {
  it("computes work day schedule with correct derived times", () => {
    const result = computeDaySchedule(workDayTemplate, null, [], [], "2026-03-28")

    expect(result.date).toBe("2026-03-28")
    expect(result.templateName).toBe("Work Day")
    expect(result.hash).toBeTruthy()

    const times = result.entries.map((e) => `${e.time} ${e.label}`)

    // Wake at 06:00
    expect(times).toContainEqual("06:00 Wake up")
    // Leave at 07:15 - 30 = 06:45
    expect(times).toContainEqual("06:35 10 min before leave")
    expect(times).toContainEqual("06:45 Time to leave")
    // Lunch at 12:00
    expect(times).toContainEqual("12:00 Lunch")
    // Dinner at 18:00
    expect(times).toContainEqual("18:00 Dinner")
    // Bedtime = 06:00 - 7h = 23:00
    expect(times).toContainEqual("23:00 Bedtime")
    // Wind down = 23:00 - 120min = 21:00
    expect(times).toContainEqual("21:00 Wind down")
  })

  it("computes off day schedule without commute entries", () => {
    const result = computeDaySchedule(offDayTemplate, null, [], [], "2026-03-29")

    const labels = result.entries.map((e) => e.label)

    expect(labels).toContain("Wake up")
    expect(labels).toContain("Lunch")
    expect(labels).not.toContain("Time to leave")
    expect(labels).not.toContain("10 min before leave")
  })

  it("entries are sorted by time", () => {
    const result = computeDaySchedule(workDayTemplate, null, [], [], "2026-03-28")

    for (let i = 1; i < result.entries.length; i++) {
      expect(result.entries[i].time >= result.entries[i - 1].time).toBe(true)
    }
  })

  it("applies overrides to template", () => {
    const override: DayStructureOverride = {
      overrideDate: "2026-03-28",
      templateId: null,
      overridesJson: { wakeTime: "07:00" },
    }

    const result = computeDaySchedule(workDayTemplate, override, [], [], "2026-03-28")

    const wakeEntry = result.entries.find((e) => e.label === "Wake up")
    expect(wakeEntry?.time).toBe("07:00")

    // Bedtime should shift: 07:00 - 7h = 00:00
    const bedEntry = result.entries.find((e) => e.label === "Bedtime")
    expect(bedEntry?.time).toBe("00:00")
  })

  it("includes custom alarms", () => {
    const alarms: DayStructureAlarm[] = [
      { id: "a1", templateId: "t1", label: "Take medication", time: "08:30", alarmType: "alarm", sortOrder: 0 },
      { id: "a2", templateId: "t1", label: "Water plants", time: "17:00", alarmType: "reminder", sortOrder: 1 },
    ]

    const result = computeDaySchedule(workDayTemplate, null, [], alarms, "2026-03-28")

    const medEntry = result.entries.find((e) => e.label === "Take medication")
    expect(medEntry).toBeDefined()
    expect(medEntry?.type).toBe("alarm")
    expect(medEntry?.source).toBe("custom")

    const waterEntry = result.entries.find((e) => e.label === "Water plants")
    expect(waterEntry?.type).toBe("reminder")
  })

  it("includes checklist start entries", () => {
    const checklists: RoutineChecklist[] = [
      { id: "c1", name: "Night Routine", triggerTimeRef: "bedtime-30", alarmEnabled: true, sortOrder: 0 },
      { id: "c2", name: "Morning Routine", triggerTimeRef: "wake+0", alarmEnabled: false, sortOrder: 1 },
    ]

    const result = computeDaySchedule(workDayTemplate, null, checklists, [], "2026-03-28")

    const nightEntry = result.entries.find((e) => e.label === "Night Routine")
    expect(nightEntry).toBeDefined()
    expect(nightEntry?.type).toBe("alarm")        // alarmEnabled: true
    expect(nightEntry?.source).toBe("checklist")
    expect(nightEntry?.checklistId).toBe("c1")
    // bedtime=23:00, -30 = 22:30
    expect(nightEntry?.time).toBe("22:30")

    const morningEntry = result.entries.find((e) => e.label === "Morning Routine")
    expect(morningEntry?.type).toBe("reminder")    // alarmEnabled: false
    expect(morningEntry?.time).toBe("06:00")
  })

  it("produces deterministic hash for same inputs", () => {
    const r1 = computeDaySchedule(workDayTemplate, null, [], [], "2026-03-28")
    const r2 = computeDaySchedule(workDayTemplate, null, [], [], "2026-03-28")
    expect(r1.hash).toBe(r2.hash)
  })

  it("produces different hash for different inputs", () => {
    const r1 = computeDaySchedule(workDayTemplate, null, [], [], "2026-03-28")
    const r2 = computeDaySchedule(offDayTemplate, null, [], [], "2026-03-28")
    expect(r1.hash).not.toBe(r2.hash)
  })

  it("handles bedtime wrapping past midnight", () => {
    const lateTemplate: DayStructureTemplate = {
      ...workDayTemplate,
      wakeTime: "05:00",
      sleepGoalHours: 7,
    }
    // bedtime = 05:00 - 7h = 22:00 (previous day, wraps)
    const result = computeDaySchedule(lateTemplate, null, [], [], "2026-03-28")
    const bedEntry = result.entries.find((e) => e.label === "Bedtime")
    expect(bedEntry?.time).toBe("22:00")
  })
})
