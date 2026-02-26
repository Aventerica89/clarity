import { BarChart3 } from "lucide-react"

export function AnalyticsStub() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <BarChart3 className="size-8 mx-auto mb-3 opacity-40" />
      <p className="text-sm font-medium mb-1">Spending Analytics</p>
      <p className="text-xs">
        Category breakdowns, trends, and monthly comparisons coming soon.
      </p>
    </div>
  )
}
