'use client'

const features = [
  {
    title: 'Apple Reminders',
    description: 'Read and create reminders via EventKit — more reliable than AppleScript on iPhone',
    icon: '⏰',
  },
  {
    title: 'Push Notifications',
    description: 'Routine reminders and "Don\'t forget" nudges from the AI coach',
    icon: '🔔',
  },
  {
    title: '"What now?" on the go',
    description: 'Ask the AI coach anywhere — same intelligence as the web app',
    icon: '🎯',
  },
]

export default function MobileAppPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground mb-4">
            Coming in Phase 5
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Clarity Mobile
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Native iOS app for deep Apple ecosystem integration. EventKit access for Reminders and Calendar, push notifications, and the full AI coach experience.
          </p>
        </div>

        {/* Phone Mockup */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            <div className="w-56 h-[440px] bg-slate-900 rounded-[3rem] border-4 border-slate-700 shadow-2xl overflow-hidden">
              <div className="absolute inset-3 bg-slate-800 rounded-[2.5rem] flex flex-col overflow-hidden">
                {/* Status bar */}
                <div className="flex justify-between items-center px-4 pt-3 pb-1">
                  <span className="text-white text-xs font-medium">9:41</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-1.5 bg-white rounded-sm" />
                    <div className="w-1 h-1.5 bg-white/50 rounded-sm" />
                  </div>
                </div>
                {/* Notch */}
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <div className="w-16 h-5 bg-black rounded-b-2xl" />
                </div>
                {/* App content */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl">
                    ✦
                  </div>
                  <div className="text-white font-semibold text-sm">Clarity</div>
                  <div className="w-full rounded-lg bg-slate-700 p-3">
                    <div className="text-white/60 text-xs mb-1">Coach says</div>
                    <div className="text-white text-xs leading-relaxed">
                      Work on the tax filing. Your calendar is clear until 2pm.
                    </div>
                  </div>
                  <div className="w-full space-y-1.5">
                    {['Complete tax filing', 'Review PR #47', 'Morning walk'].map((task, i) => (
                      <div key={task} className="flex items-center gap-2 rounded-lg bg-slate-700/60 px-2 py-1.5">
                        <div className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-orange-400' : 'bg-green-400'}`} />
                        <span className="text-white/80 text-xs truncate">{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Tab bar */}
                <div className="flex justify-around items-center px-4 py-3 border-t border-slate-700">
                  {['Today', 'Routines', 'Settings'].map((tab) => (
                    <div key={tab} className="flex flex-col items-center gap-0.5">
                      <div className={`h-4 w-4 rounded-sm ${tab === 'Today' ? 'bg-violet-400' : 'bg-slate-600'}`} />
                      <span className={`text-[10px] ${tab === 'Today' ? 'text-violet-400' : 'text-slate-500'}`}>{tab}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-4 sm:grid-cols-3 mb-12">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border bg-card p-4">
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Distribution note */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-2">Distribution</h3>
          <p className="text-sm text-muted-foreground">
            For 2-3 users, the app will be distributed via <strong>TestFlight</strong> — no App Store review required. Family members install from an invite link. This avoids the $99/year Apple Developer account review requirements for public distribution.
          </p>
        </div>

      </div>
    </div>
  )
}
