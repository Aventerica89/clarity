'use client'

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-16">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Clarity Design System</h1>
          <p className="mt-2 text-muted-foreground">Component library and visual language</p>
        </div>

        {/* Colors */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Colors</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ColorSwatch name="Background" className="bg-background border" />
            <ColorSwatch name="Foreground" className="bg-foreground" textClass="text-background" />
            <ColorSwatch name="Primary" className="bg-primary" textClass="text-primary-foreground" />
            <ColorSwatch name="Secondary" className="bg-secondary" />
            <ColorSwatch name="Muted" className="bg-muted" textClass="text-muted-foreground" />
            <ColorSwatch name="Accent" className="bg-accent" textClass="text-accent-foreground" />
            <ColorSwatch name="Destructive" className="bg-destructive" textClass="text-destructive-foreground" />
            <ColorSwatch name="Border" className="bg-border" />
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Typography</h2>
          <div className="space-y-4 rounded-xl border p-6">
            <p className="text-4xl font-bold tracking-tight">Heading 1 — Daily Dashboard</p>
            <p className="text-3xl font-bold tracking-tight">Heading 2 — Today's Tasks</p>
            <p className="text-2xl font-semibold">Heading 3 — Morning Routine</p>
            <p className="text-xl font-semibold">Heading 4 — In Progress</p>
            <p className="text-base leading-relaxed text-foreground">Body text — Your tasks are sorted by AI priority score. Claude considers deadlines, energy, and context to surface the most important work first.</p>
            <p className="text-sm text-muted-foreground">Small / Muted — Last synced 2 minutes ago from Todoist, Google Calendar, and Apple Reminders</p>
            <code className="rounded bg-muted px-2 py-1 text-sm font-mono">Mono — priority_score: 87</code>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Primary
            </button>
            <button className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              Secondary
            </button>
            <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              Outline
            </button>
            <button className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              Ghost
            </button>
            <button className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90">
              Destructive
            </button>
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed">
              Disabled
            </button>
          </div>
        </section>

        {/* Task Cards (core component) */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Task Cards</h2>
          <div className="space-y-2">
            <TaskCardPreview
              title="Complete tax filing"
              source="apple_reminders"
              priority={94}
              dueDate="Today"
              label="Finance"
            />
            <TaskCardPreview
              title="Review pull request #47"
              source="todoist"
              priority={71}
              dueDate="Tomorrow"
              label="Work"
            />
            <TaskCardPreview
              title="Book dentist appointment"
              source="manual"
              priority={42}
              dueDate="This week"
              label="Health"
            />
          </div>
        </section>

        {/* Event Cards */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Event Cards</h2>
          <div className="space-y-2">
            <EventCardPreview
              title="Team standup"
              time="9:00 – 9:30 AM"
              calendar="Work"
              color="bg-blue-500"
            />
            <EventCardPreview
              title="Dentist appointment"
              time="2:00 – 3:00 PM"
              calendar="Personal"
              color="bg-green-500"
            />
          </div>
        </section>

        {/* Coach Panel */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">AI Coach Panel</h2>
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Clarity Coach</span>
            </div>
            <p className="mb-4 text-lg font-semibold">What should I do right now?</p>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-foreground leading-relaxed">
                <strong>Work on the tax filing.</strong> It's due in 3 days, your calendar is clear until 2pm, and you've been putting it off. Estimated 2 hours. After that, review the pull request — your teammate is waiting.
              </p>
            </div>
            <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Ask Coach
            </button>
          </div>
        </section>

        {/* Priority Badges */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Priority Badges</h2>
          <div className="flex flex-wrap gap-3">
            <PriorityBadge score={95} />
            <PriorityBadge score={75} />
            <PriorityBadge score={50} />
            <PriorityBadge score={25} />
          </div>
        </section>

        {/* Source Icons */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Integration Sources</h2>
          <div className="flex flex-wrap gap-4">
            {['Todoist', 'Google Calendar', 'Apple Reminders', 'Apple Calendar', 'Gmail', 'Manual'].map((source) => (
              <div key={source} className="flex items-center gap-2 rounded-full border px-3 py-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm">{source}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Streaks */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold">Routine Streaks</h2>
          <div className="flex gap-4">
            <StreakDisplay label="Morning Pages" streak={14} />
            <StreakDisplay label="Exercise" streak={7} />
            <StreakDisplay label="Evening Review" streak={3} />
          </div>
        </section>

      </div>
    </div>
  )
}

function ColorSwatch({
  name,
  className,
  textClass = 'text-foreground',
}: {
  name: string
  className: string
  textClass?: string
}) {
  return (
    <div className={`rounded-xl p-4 ${className}`}>
      <span className={`text-sm font-medium ${textClass}`}>{name}</span>
    </div>
  )
}

function TaskCardPreview({
  title,
  source,
  priority,
  dueDate,
  label,
}: {
  title: string
  source: string
  priority: number
  dueDate: string
  label: string
}) {
  const priorityColor =
    priority >= 80 ? 'text-red-500' : priority >= 60 ? 'text-orange-500' : priority >= 40 ? 'text-yellow-500' : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors">
      <input type="checkbox" className="h-4 w-4 rounded" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{source}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{dueDate}</span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">{label}</span>
        </div>
      </div>
      <span className={`text-sm font-bold tabular-nums ${priorityColor}`}>{priority}</span>
    </div>
  )
}

function EventCardPreview({
  title,
  time,
  calendar,
  color,
}: {
  title: string
  time: string
  calendar: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className={`h-full w-1 rounded-full self-stretch ${color}`} />
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{time} · {calendar}</p>
      </div>
    </div>
  )
}

function PriorityBadge({ score }: { score: number }) {
  const label = score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 40 ? 'Medium' : 'Low'
  const classes =
    score >= 80
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : score >= 60
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      : score >= 40
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      : 'bg-muted text-muted-foreground'

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${classes}`}>
      <span className="tabular-nums">{score}</span>
      <span>{label}</span>
    </div>
  )
}

function StreakDisplay({ label, streak }: { label: string; streak: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center">
      <div className="text-3xl font-bold">{streak}</div>
      <div className="mt-1 text-xs text-muted-foreground">day streak</div>
      <div className="mt-2 text-sm font-medium">{label}</div>
    </div>
  )
}
