import { RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function RoutinesPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Routines</h1>
        <p className="text-muted-foreground text-sm">Build streaks with recurring habits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4 text-primary" />
            Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Routines let you track recurring habits with streak counts. Define daily, weekday, or
            custom schedules and mark them complete each day.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
