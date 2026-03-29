import Link from "next/link"
import { Clock, RotateCcw, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function RoutinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Routines</h1>
        <p className="text-muted-foreground text-sm">
          Manage your daily schedule, checklists, and habits.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/routines/day-structure" className="group">
          <Card className="h-full transition-colors hover:border-clarity-amber/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-clarity-amber" />
                Day Structure
                <ArrowRight className="size-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Define your daily schedule with wake time, meals, commute, and bedtime.
                Auto-calculate alarms and manage morning/evening routine checklists.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="size-4 text-muted-foreground" />
              Habits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track recurring habits with streak counts. Daily, weekday, or custom schedules.
              Coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
