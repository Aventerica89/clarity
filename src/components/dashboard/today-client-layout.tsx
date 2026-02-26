"use client"

import { DayPlanV3 } from "@/components/dashboard/day-plan"
import { WidgetSidebar } from "@/components/dashboard/widgets/widget-sidebar"
import { WeatherWidget } from "@/components/dashboard/widgets/weather-widget"
import { FinanceWidget } from "@/components/dashboard/widgets/finance-widget"
import { RunwayWidget } from "@/components/dashboard/widgets/runway-widget"
import { StreaksWidget } from "@/components/dashboard/widgets/streaks-widget"
import { TriageWidget } from "@/components/dashboard/widgets/triage-widget"
import { WeekWidget } from "@/components/dashboard/widgets/week-widget"

const WIDGETS = [
  { id: "weather", component: <WeatherWidget /> },
  { id: "finance", component: <FinanceWidget /> },
  { id: "runway", component: <RunwayWidget /> },
  { id: "streaks", component: <StreaksWidget /> },
  { id: "triage", component: <TriageWidget /> },
  { id: "week", component: <WeekWidget /> },
]

export function TodayClientLayout() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
      {/* Left: Day plan with time blocks */}
      <DayPlanV3 />

      {/* Right: Widget sidebar (horizontal scroll on mobile) */}
      <WidgetSidebar widgets={WIDGETS} />
    </div>
  )
}
