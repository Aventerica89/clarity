# Implementation Plan: Clarity

> A unified productivity hub connecting Google Calendar, Todoist, Gmail,
> Apple Reminders, Apple Calendar, Apple Notes, and Apple Mail into one
> AI-prioritized daily view with routines and smart reminders.
>
> **Core killer feature**: Ask "What should I do right now?" and get a
> specific, actionable answer from Claude — not a sorted list, a decision.

## MVP Scope (Phases 1-3)

**In v1.0:**
- Google OAuth login (Better Auth)
- Google Calendar sync (read events)
- Todoist sync (read/complete tasks)
- Apple data via Mac companion (Reminders, Calendar, Notes)
- Unified daily dashboard (events + tasks, by time + priority)
- AI priority scoring (Claude Haiku, 0-100 scores)
- **"What should I do right now?" AI coach** (Claude Sonnet)
- Routine builder with streak tracking
- Command palette (Cmd+K)
- Settings: connected accounts, sync status
- Multi-user support (owner + 2 family members)

**Deferred to v1.1+:**
- Gmail integration (flagged email -> tasks)
- Shared routines between users
- Push notifications
- Expo mobile app
- Apple Sign in with Apple (email/password + Google is enough for 3 users)

## Phase 1: Foundation (Est. 12-16 hours)

### 1.1 Project Scaffolding (2h)
- Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir`
- Run: `npx shadcn@latest init`
- Install shadcn components: `npx shadcn@latest add button card dialog command input label separator tabs avatar badge dropdown-menu scroll-area sheet skeleton switch toast tooltip`
- Install deps: `better-auth @supabase/supabase-js @anthropic-ai/sdk googleapis zod react-hook-form`
- Create `.env.example` and `.env.local.tpl`
- Set up Vitest + Testing Library
- **Env vars:** `NEXT_PUBLIC_APP_URL`

### 1.2 Supabase Setup (2h)
- Create Supabase project
- Write and run schema migrations (see ARCHITECTURE.md)
- Enable pgcrypto for token encryption
- Write encryption helper: `src/lib/crypto.ts`
- Create typed Supabase client: `src/lib/db.ts` (server + browser variants)
- Configure RLS policies
- **Env vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY`

### 1.3 Better Auth Setup (3h)
- Configure Better Auth in `src/lib/auth.ts` with Supabase adapter
- Add Google social provider (scopes: openid, profile, email, calendar.readonly)
- Add email/password fallback
- Create catch-all handler: `src/app/api/auth/[...all]/route.ts`
- Create auth client: `src/lib/auth-client.ts`
- Create middleware for route protection: `src/middleware.ts`
- **Env vars:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Note:** Store all env vars in 1Password under `#clarity / VAR_NAME` convention

### 1.4 Login Page + Auth Flow (2h)
- `src/app/(auth)/login/page.tsx` — Google button + email/password form
- `src/app/(auth)/layout.tsx` — centered, minimal layout
- Handle post-login redirect to `/`

### 1.5 App Shell + Layout (2h)
- `src/app/(dashboard)/layout.tsx` — authenticated shell
- `src/components/sidebar.tsx` — nav (Dashboard, Routines, Settings)
- `src/components/header.tsx` — date display, user avatar, sync indicator
- Dark mode via next-themes
- Responsive (sidebar collapses on mobile)

### 1.6 Vercel Deployment (1h)
- Connect repo to Vercel (Aventerica89/clarity)
- Deploy env vars via 1Password MCP
- Create `vercel.json` with cron config

### 1.7 Foundation Tests (2h)
- Unit: Supabase client factory, crypto helper
- E2E: login flow

---

## Phase 2: Integrations + Sync (Est. 14-18 hours)

### 2.1 Google Calendar Integration (4h)
- `src/lib/integrations/google-calendar.ts`
  - `fetchEvents(tokens, timeMin, timeMax)` — fetch events, return normalized
  - `refreshToken(refreshToken)` — token refresh
  - `normalizeEvent(gcalEvent)` — map to CalendarEvent type
- `src/app/api/sync/google-calendar/route.ts` — fetch + upsert events
- Store Google tokens encrypted in `integrations` table
- Settings card: "Connect Google Calendar" with re-consent OAuth flow
- **Env vars:** reuses Google OAuth from Phase 1

### 2.2 Todoist Integration (3h)
- `src/lib/integrations/todoist.ts`
  - `fetchTasks(apiToken)` — get active tasks
  - `completeTask(apiToken, taskId)` — mark complete in Todoist
  - `normalizeTask(todoistTask)` — map to Task type (Todoist p4=urgent maps to score hint)
- `src/app/api/sync/todoist/route.ts` — fetch + upsert tasks
- Settings: API token input (stored encrypted)

### 2.3 Mac Companion (`clarity-companion/`) (5h)
This is a separate Node.js/Bun project in the monorepo.

- `clarity-companion/src/index.ts` — HTTP server on port 3741
- `clarity-companion/src/apple/reminders.ts` — AppleScript wrapper for Reminders
- `clarity-companion/src/apple/calendar.ts` — AppleScript wrapper for Calendar
- `clarity-companion/src/apple/notes.ts` — AppleScript wrapper for Notes
- `clarity-companion/src/sync.ts` — reads Apple apps, pushes to Supabase
- `clarity-companion/src/auth.ts` — authenticates with web API using session

AppleScript patterns (from apple-mcp reference):
```applescript
-- Read reminders
tell application "Reminders"
  set allReminders to reminders of default list
  repeat with r in allReminders
    -- id, name, due date, completed
  end repeat
end tell

-- Create reminder
tell application "Reminders"
  make new reminder in default list with properties {name:"Task title", due date: date "MM/DD/YYYY HH:MM:SS"}
end tell
```

Setup: launchd plist for auto-start on login (`com.clarity.companion.plist`)

- `src/app/api/companion/sync/route.ts` — receives Apple data from companion
- **Auth:** companion sends Better Auth session token in Authorization header

### 2.4 Sync Orchestrator + Cron (2h)
- `src/lib/sync/orchestrator.ts` — runs all active integrations
- `src/app/api/cron/sync/route.ts` — Vercel cron handler
- Error handling: update `sync_status`, `last_error` per integration
- `vercel.json`: `{"crons": [{"path": "/api/cron/sync", "schedule": "*/5 * * * *"}]}`
- **Env vars:** `CRON_SECRET`

### 2.5 Unified Types + Mappers (2h)
- `src/types/task.ts` — Zod schema + TypeScript type
- `src/types/event.ts`
- `src/types/integration.ts`
- `src/lib/mappers/` — normalize each source to unified types

### 2.6 Integration Tests (2h)
- Mock Google Calendar API responses, test sync + upsert
- Mock Todoist responses, test normalization + dedup
- Test companion auth middleware
- Test RLS: user A cannot read user B's tasks

---

## Phase 3: Dashboard + AI Coach + Routines (Est. 18-22 hours)

### 3.1 Daily Dashboard (4h)
- `src/app/(dashboard)/page.tsx` — server component fetching today's data
- `src/components/dashboard/daily-view.tsx` — timeline layout
- `src/components/dashboard/task-card.tsx` — task with source icon, priority badge, complete checkbox
- `src/components/dashboard/event-card.tsx` — event with time range, calendar color
- `src/components/dashboard/time-block.tsx` — time slot grouping
- Shows: today's tasks (all sources, sorted by priority_score) + today's events (all sources)

### 3.2 "What Should I Do Right Now?" AI Coach (4h)
This is the core feature. **Build this before manual priority.**

- `src/lib/ai/coach.ts`
  - `buildContext(userId, now)` — fetches tasks, events, routines, overdue items
  - `askCoach(context, question)` — calls Claude Sonnet with structured context
- `src/app/api/ai/coach/route.ts` — POST endpoint, streams response
- `src/components/dashboard/coach-panel.tsx`
  - Prominent button: "What should I do right now?"
  - Text input for custom questions
  - Streaming response display
  - Refreshes every 30 min automatically when dashboard is open

Claude Sonnet prompt (in `src/lib/ai/prompts.ts`):
```typescript
export const COACH_SYSTEM_PROMPT = `
You are Clarity's personal productivity coach.
You have complete visibility into the user's tasks, events, and context.

When asked "What should I do right now?" or a similar question:
- Pick ONE thing to work on
- State the reason in one sentence
- Mention the next thing after
- If a routine is scheduled and not done, consider suggesting it
- Never give a list of options — make the decision
- Keep the answer under 100 words
- Be direct and confident
`
```

- **Env vars:** `ANTHROPIC_API_KEY`
- **Model:** claude-sonnet-4-6 for coach, claude-haiku-4-5-20251001 for batch scoring

### 3.3 AI Priority Scoring (3h)
- `src/lib/ai/prioritize.ts`
  - `scoreBatch(tasks, context)` — send up to 20 tasks, get 0-100 scores
  - Uses Claude Haiku (cost-efficient for batching)
- `src/lib/ai/schemas.ts` — Zod schemas for structured output
- `src/app/api/ai/prioritize/route.ts` — POST endpoint
- Auto-scores after every sync cycle
- Manual "Re-score" button on dashboard

### 3.4 Manual Priority Override (1h)
- Star rating (1-5) on each task card
- PATCH `/api/tasks/[id]` endpoint
- `priority_manual` overrides `priority_score` in sort order

### 3.5 Routine Builder (4h)
- `src/app/(dashboard)/routines/page.tsx` — list + create
- `src/components/routines/routine-form.tsx` — title, frequency, time, duration
- `src/components/routines/routine-card.tsx` — streak fire icon, complete button
- `src/lib/routines/engine.ts`
  - `calculateStreak(completions[])` — handles gaps, timezones
  - `isScheduledToday(routine, date)` — check against frequency
- API: GET/POST/PATCH/DELETE `/api/routines`, POST `/api/routines/[id]/complete`
- Routines show on daily dashboard as tasks (source = 'routine')

### 3.6 Command Palette (1h)
- `src/components/command-palette.tsx` — shadcn Command component
- Cmd+K shortcut
- Commands: Dashboard, Routines, Settings, Add Task, Sync Now, Ask Coach

### 3.7 Settings Page (2h)
- `src/app/(dashboard)/settings/page.tsx`
- Tabs: General, Connections, AI
- General: timezone, work hours, AI scoring toggle
- Connections: integration cards with sync status
- AI: coach preferences (auto-refresh interval, response verbosity)

### 3.8 Phase 3 Tests (2h)
- Unit: streak calculation edge cases
- Unit: AI context builder (correct data fetched + formatted)
- Integration: coach API with mocked Claude
- E2E: dashboard loads, complete task, check streak

---

## Phase 4: Extended Integrations + Polish (Est. 10-14 hours)

### 4.1 Gmail Integration — Quick Wins (2h) ← NEXT

**Bug fix — dismissed emails re-appearing after sync:**
- Root cause: triage dismiss only removes from Clarity DB; next sync re-fetches from Gmail and re-adds
- Fix: call `messages.trash` (Gmail API) when user dismisses a Gmail-sourced triage item
  - `src/app/api/triage/[id]/route.ts` — on `action: "dismiss"` with `source === "gmail"`, call Gmail `messages.trash` for the `sourceId`
  - Requires `gmail.modify` OAuth scope (already needed for trash; current scope is `gmail.readonly`)
  - Update scope in `src/lib/auth.ts` Google provider config

**Incremental sync (history.list):**
- Store `gmailHistoryId` in `integrations` table (or `user_profile`) after each sync
- Replace full inbox re-list with `history.list?startHistoryId=` — only fetch changes since last sync
- Reduces API calls by ~90%, prevents already-processed items resurfacing
  - `src/lib/integrations/gmail.ts` — add `syncIncremental(userId, historyId)` function
  - `src/app/api/cron/sync/route.ts` — use incremental path when historyId exists, full sync as fallback

**Deferred (think on these later):**
- `messages.send` / `drafts.create` — reply from Clarity
- `threads.get` — full conversation threading
- `messages.attachments.get` — attachment AI analysis
- `labels.modify` — apply Gmail labels from triage actions
- `settings.getVacation` — surface OOO in coach context

### 4.2 Routine Sharing (2h)
- Invite family member by email
- Shared routines appear on invitee's dashboard
- RLS: `shared_routines` table + policies

### 4.3 Google Calendar Webhook (2h)
- Register push notification channel via Calendar API `watch()`
- `src/app/api/webhooks/google/route.ts` — handle push
- Triggers sync for affected user on calendar change

### 4.4 Companion Auto-Sync Back (2h)
- When companion pulls from Supabase and finds new high-priority tasks
- Auto-creates Apple Reminder for those tasks (write-back)
- Dedup: don't create duplicate if reminder already exists

### 4.5 Polish + Edge Cases (3h)
- Empty states with helpful prompts
- Error boundaries per section
- Skeleton loading states
- Timezone edge cases (due dates, all-day events)
- Offline handling (show stale data clearly)

---

## Phase 5: Expo Mobile Companion (Est. 16-20 hours)

*Start after Phases 1-4 are stable.*

### 5.1 Expo Setup (2h)
- `npx create-expo-app@latest clarity-mobile --template blank-typescript`
- Install: expo-calendar, expo-notifications, expo-secure-store

### 5.2 Mobile Auth (2h)
- Google OAuth via expo-auth-session
- Store session in SecureStore
- API client with auth headers

### 5.3 Apple Reminders (EventKit) (4h)
- Read/write Reminders via expo-calendar
- Sync to server bridge endpoint
- Request permissions flow

### 5.4 Push Notifications (2h)
- expo-notifications for routine reminders
- "Time to do your [routine]" alerts

### 5.5 Mobile Dashboard (4h)
- Pull-to-refresh → sync
- Swipe-to-complete on tasks
- Coach panel: tap "What now?" → streaming answer

### 5.6 App Store / TestFlight (2h)
- TestFlight for family distribution
- No public App Store needed for 3 users

---

## Environment Variables (Complete)

| Variable | Phase | Source | 1Password Path |
|----------|-------|--------|----------------|
| `NEXT_PUBLIC_APP_URL` | 1 | Config | — |
| `SUPABASE_URL` | 1 | Supabase | `#clarity / SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | 1 | Supabase | `#clarity / SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | 1 | Supabase | `#clarity / SUPABASE_SERVICE_ROLE_KEY` |
| `TOKEN_ENCRYPTION_KEY` | 1 | Generate | `#clarity / TOKEN_ENCRYPTION_KEY` |
| `BETTER_AUTH_SECRET` | 1 | Generate | `#clarity / BETTER_AUTH_SECRET` |
| `BETTER_AUTH_URL` | 1 | Config | — |
| `GOOGLE_CLIENT_ID` | 1 | Google Cloud | `#clarity / GOOGLE_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | 1 | Google Cloud | `#clarity / GOOGLE_CLIENT_SECRET` |
| `CRON_SECRET` | 2 | Generate | `#clarity / CRON_SECRET` |
| `ANTHROPIC_API_KEY` | 3 | 1P Business | `Business / ANTHROPIC_API_KEY` |
| `GOOGLE_WEBHOOK_SECRET` | 4 | Generate | `#clarity / GOOGLE_WEBHOOK_SECRET` |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Google OAuth scope review | Under 100 users = "testing" mode only. Add all users as test users in Google Cloud Console. |
| Apple companion reliability | AppleScript can be flaky if Apple apps aren't running. Companion should skip gracefully and retry. |
| Claude API costs | Haiku for scoring (~$0.01/batch), Sonnet only for coach (user-triggered). Daily cap: $1 max. |
| Companion install friction | Provide a one-click install script. Users run `curl install.sh | bash`. |
| Cron limits | Single cron endpoint batches all users. Fine for 2-3 users. |

---

## Success Criteria

### MVP
- [ ] Login with Google OAuth
- [ ] Google Calendar events on dashboard
- [ ] Todoist tasks on dashboard with AI priority scores
- [ ] Apple Reminders + Calendar on dashboard (via companion)
- [ ] "What should I do right now?" gives a specific, correct answer
- [ ] Create and complete routines with streak tracking
- [ ] All data isolated per user (RLS tested)
- [ ] Companion installs and runs on Mac with a single command
- [ ] Tests pass, 80%+ coverage on `src/lib/`

---

## Mobile App Companion (Future — Phase 5)

### Platform
React Native + Expo for iOS/Android.

### Core Features (Mobile)
1. "What now?" coach — same AI, mobile-optimized
2. Apple Reminders read/write (EventKit — more reliable than AppleScript on mobile)
3. Push notifications for routines
4. Pull-to-refresh dashboard
5. Swipe-to-complete tasks

### Distribution
TestFlight for family members. No public App Store release needed.
