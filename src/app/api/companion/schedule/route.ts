import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { authenticateCompanion } from "@/lib/companion-auth"
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
  const authResult = await authenticateCompanion(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  const url = new URL(request.url)
  const date = url.searchParams.get("date") ?? getTodayDate()
  const dayOfWeek = new Date(date + "T12:00:00").getDay()

  try {
    const [overrideRow] = await db
      .select()
      .from(dayStructureOverrides)
      .where(
        and(
          eq(dayStructureOverrides.userId, userId),
          eq(dayStructureOverrides.overrideDate, date),
        ),
      )

    const templates = await db
      .select()
      .from(dayStructureTemplates)
      .where(
        and(
          eq(dayStructureTemplates.userId, userId),
          eq(dayStructureTemplates.isActive, true),
        ),
      )

    if (templates.length === 0) {
      return NextResponse.json({ schedule: null, message: "No templates configured" })
    }

    let templateRow = overrideRow?.templateId
      ? templates.find((t) => t.id === overrideRow.templateId)
      : undefined

    if (!templateRow) {
      templateRow = templates.find((t) => {
        const days: number[] = JSON.parse(t.daysOfWeek || "[]")
        return days.includes(dayOfWeek)
      })
    }

    if (!templateRow) templateRow = templates[0]

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

    const override: DayStructureOverride | null = overrideRow
      ? {
          overrideDate: overrideRow.overrideDate,
          templateId: overrideRow.templateId,
          overridesJson: JSON.parse(overrideRow.overridesJson || "{}"),
        }
      : null

    const alarmRows = await db
      .select()
      .from(dayStructureAlarms)
      .where(
        and(
          eq(dayStructureAlarms.templateId, templateRow.id),
          eq(dayStructureAlarms.userId, userId),
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

    const checklistRows = await db
      .select()
      .from(routineChecklists)
      .where(
        and(
          eq(routineChecklists.userId, userId),
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
    console.error("[companion/schedule] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
