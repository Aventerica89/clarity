import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TodayPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-muted-foreground text-sm">Your unified view</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            What should I do right now?
          </CardTitle>
          <CardDescription>
            Ask Claude to analyze your tasks, events, and context to give you one clear, actionable
            answer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full sm:w-auto">Ask Claude</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect Google Calendar or Apple Calendar to see events here.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect Todoist or Apple Reminders to see tasks here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
