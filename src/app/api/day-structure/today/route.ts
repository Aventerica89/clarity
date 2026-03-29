import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  dayStructureTemplates,
  dayStructureAlarms,
  dayStructureOverrides,
  routineChecklists,
} from "@/lib/schema"
import { computeDaySchedule } from "@/lib/day-structure/compute"
import type { DayStructureTemplate, DayStructureAlarm, DayStructureOverride, RoutineChecklist } from "@/lib/day-structure/types"

function getTodayDate(): string {
  const tz = process.env.CLARITY_TIMEZONE ?? "America/Phoenix"
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const date = url.searchParams.get("date") ?? getTodayDate()
  const dayOfWeek = new Date(date + "T12:00:00").getDay() // 0=Sun..6=Sat

  try {
    // Check for a date-specific override that forces a template
    const [overrideRow] = await db
      .select()
      .from(dayStructureOverrides)
      .where(
        and(
          eq(dayStructureOverrides.userId, session.user.id),
          eq(dayStructureOverrides.overrideDate, date),
        ),
      )

    // Get all active templates for the user
    const templates = await db
      .select()
      .from(dayStructureTemplates)
      .where(
        and(
          eq(dayStructureTemplates.userId, session.user.id),
          eq(dayStructureTemplates.isActive, true),
        ),
      )

    if (templates.length === 0) {
      return NextResponse.json({ schedule: null, message: "No templates configured" })
    }

    // Pick template: override templateId > day-of-week match > first template
    let templateRow = overrideRow?.templateId
      ? templates.find((t) => t.id === overrideRow.templateId)
      : undefined

    if (!templateRow) {
      templateRow = templates.find((t) => {
        const days: number[] = JSON.parse(t.daysOfWeek || "[]")
        return days.includes(dayOfWeek)
      })
    }

    if (!templateRow) {
      templateRow = templates[0]
    }

    // Convert DB row to typed template
    const template: DayStructureTemplate = {
      id: templateRow.id,
      name: templateRow.name,
      daysOfWeek: JSON.parse(templateRow.daysOfWeek || "[]"),
      sleepGoalHours: templateRow.sleepGoalHours,
      wakeTime: templateRow.wakeTime,
      prepTimeMins: templateRow.prepTimeMins,
      commuteTimeMins: templateRow.commuteTimeMins,
      workStartTime: templateRow.workStartTime,
      lunchTime: templateRow.lunchTime,
      dinnerTime: templateRow.dinnerTime,
      windDownMins: templateRow.windDownMins,
    }

    // Build override if exists
    const override: DayStructureOverride | null = overrideRow
      ? {
          overrideDate: overrideRow.overrideDate,
          templateId: overrideRow.templateId,
          overridesJson: JSON.parse(overrideRow.overridesJson || "{}"),
        }
      : null

    // Get custom alarms for this template
    const alarmRows = await db
      .select()
      .from(dayStructureAlarms)
      .where(
        and(
          eq(dayStructureAlarms.templateId, templateRow.id),
          eq(dayStructureAlarms.userId, session.user.id),
        ),
      )

    const alarms: DayStructureAlarm[] = alarmRows.map((a) => ({
      id: a.id,
      templateId: a.templateId,
      label: a.label,
      time: a.time,
      alarmType: a.alarmType as "alarm" | "reminder",
      sortOrder: a.sortOrder,
    }))

    // Get active checklists
    const checklistRows = await db
      .select()
      .from(routineChecklists)
      .where(
        and(
          eq(routineChecklists.userId, session.user.id),
          eq(routineChecklists.isActive, true),
        ),
      )

    const checklists: RoutineChecklist[] = checklistRows.map((c) => ({
      id: c.id,
      name: c.name,
      triggerTimeRef: c.triggerTimeRef,
      alarmEnabled: c.alarmEnabled,
      sortOrder: c.sortOrder,
    }))

    const schedule = computeDaySchedule(template, override, checklists, alarms, date)

    return NextResponse.json({ schedule })
  } catch (err) {
    console.error("[day-structure/today] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
