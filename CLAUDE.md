# Clarity — CLAUDE.md

## Project Overview

**Clarity** is a personal productivity hub for 2-3 users (owner + family). It unifies Google Calendar, Todoist, Gmail, Plaid (finances), and life context into one AI-prioritized daily view with routines, triage, and smart reminders.

**Core killer feature:** Ask "What should I do right now?" — the AI coach reads all your tasks, events, and context to give a specific, actionable answer.

## Stack

| Layer | Technology |
|-------|-----------|
| Web app | Next.js 16.x (App Router) |
| Database | Turso (LibSQL via Drizzle ORM) |
| Auth | Better Auth (Google OAuth + email/password) |
| Hosting | Vercel |
| Cron | GitHub Actions (`*/15 * * * *`) — free, replaces Vercel Cron |
| UI | Tailwind CSS v4 + shadcn/ui + Lucide icons + Tiptap (rich text) |
| AI | Multi-provider: Anthropic → DeepSeek → Groq → Gemini (fallback order) |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Finance | Plaid Link + transactions sync |
| Apple bridge | clarity-companion (local Node.js AppleScript process on each Mac) — planned |
| Mobile | PWA (installed) — native Expo deferred |

## Architecture

```
Browser (Vercel) <-> Turso (LibSQL/Drizzle)
                          ^
GH Actions cron -------> /api/cron/sync (CRON_SECRET auth, every 15 min)
GH Actions cron -------> /api/cron/prune (CRON_SECRET auth, daily 3am UTC)
Google APIs -----------> /api/sync, /api/auth (OAuth)
Todoist API -----------> /api/todoist (OAuth)
Plaid API -------------> /api/plaid (Link token + transactions)
AI providers ----------> /api/ai, /api/chat (coach + triage scoring)
Upstash Redis ---------> rate limiting (AI calls, sync)
Mac companion ---------> /api/* (Apple data push) — planned
```

## Commands

### Dev Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run dev:stable` | Start dev server in webpack mode with Tailwind oxide disabled (fallback when Turbopack native bindings fail) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run dev:auth` | Dev server with 1Password auth injection |
| `npm run dev:auth:stable` | Auth-injected stable dev mode (webpack + no-oxide) |
| `npm run env:inject` | Populate `.env.local` from 1Password |

### Database Commands

| Command | Purpose |
|---------|---------|
| `npx drizzle-kit generate` | Generate migration from schema changes |
| `npx drizzle-kit push` | Push schema directly to Turso (dev) |
| `npx drizzle-kit studio` | Open Drizzle Studio GUI |

Migrations live in `supabase/migrations/`. Config: `drizzle.config.ts` (dialect: `turso`).

### Skill Commands

| Command | Purpose |
|---------|---------|
| `/tdd` | Start TDD workflow |
| `/commit` | Create conventional commit |
| `/code-review` | Review code |
| `/deploy-check` | Pre-deployment checklist |

## Key Integrations

| Provider | Method | Data |
|----------|--------|------|
| Google Calendar | REST API + OAuth | Events (read) |
| Gmail | REST API + OAuth | Emails → DB cache, triage, tasks |
| Todoist | OAuth (PKCE) | Tasks (read/write/complete) |
| Plaid | Link + sync API | Bank transactions, balances |
| OpenWeatherMap | API key (stored in `integrations` table) | Weather widget |
| Upstash Redis | REST API | Rate limiting for AI + sync |
| Apple (planned) | AppleScript (companion) | Reminders, Calendar, Notes, Mail |

## Environment Variables

See `.env.example` for full list. Use `npm run env:inject` to populate from 1Password.

Key vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TODOIST_CLIENT_ID`, `TODOIST_CLIENT_SECRET`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `TOKEN_ENCRYPTION_KEY`.

Also: `ANTHROPIC_API_KEY` (batch triage fallback), `OPENWEATHERMAP_API_KEY` (weather widget), `PLAID_ENV` (sandbox/development/production), `CLARITY_TIMEZONE` (optional, defaults to `America/Phoenix`).

## Important Rules

### Anthropic OAuth
- NEVER use `@ai-sdk/anthropic` for AI calls — it doesn't support OAuth tokens
- ALWAYS use `@anthropic-ai/sdk` directly via `createAnthropicClient(token)` from `@/lib/ai/client`
- The client uses `{ apiKey: token }` for all token types — both `sk-ant-api...` and `sk-ant-oat...` OAuth tokens work this way

### Data Access
- ALWAYS use Drizzle ORM with Turso client (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)
- NEVER expose `TURSO_AUTH_TOKEN` to client code — server/API routes only
- ALWAYS filter by `userId` in queries (no RLS — enforced in application layer)

### AI Providers
- Stored encrypted in `integrations` table, decrypted at runtime via `TOKEN_ENCRYPTION_KEY`
- Fallback order: Anthropic → DeepSeek → Groq → Gemini (Gemini last, quota-prone)
- Coach uses streaming; triage scoring batches 5 at a time (avoids Anthropic 429s)

### Timezone
- ALWAYS use `America/Phoenix` (UTC-7, no DST)
- Override via `CLARITY_TIMEZONE` env var if needed (defaults to `America/Phoenix` — see `src/lib/ai/coach.ts`)
- Date strings: `new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix" }).format(new Date())` → `YYYY-MM-DD`

### Apple companion (planned)
- Never store Apple app-specific passwords in the database or cloud
- Companion authenticates to the web API using the user's Better Auth session

## Gotchas

| Issue | Fix |
|-------|-----|
| Adding a new page to nav | Add to `src/lib/nav-items.ts`, then add href to `PRIMARY_HREFS` or `MORE_HREFS` in `src/components/mobile-nav.tsx` |
| Tailwind v4 scrollbar hiding | Use `scrollbar-none` (NOT `scrollbar-hide`) |
| CSS Grid child overflow | Add `min-w-0` to grid children that contain scrollable/flex content |
| Tiptap HTML inflation | Rich text HTML is much longer than plain text — Zod max set to 20000 for life-context routes |
| Turso schema drift | Use Turso HTTP API for targeted DDL when `drizzle-kit push` has conflicts |
| AI context freshness | Coach must inject fresh context on every turn (not cache from first message) |
| `stripHtml()` for AI | Always strip Tiptap HTML to plain text before sending to AI models |
| Double browser scrollbar | Apply `overflow: hidden` to `html` only — NOT `body`. Body overflow creates a BFC that breaks `h-full` height chains and all inner scroll containers. `overscroll-behavior: none` alone is insufficient. |
| Adding integration with external API key + caching | After saving key to DB, call `revalidateTag("tag")` in the POST route. Tag the external `fetch()` with `{ next: { revalidate: N, tags: ["tag"] } }`. Without this, cached responses survive key changes for up to N seconds. |
| Non-unique Drizzle indexes | Import `index` alongside `uniqueIndex` from `drizzle-orm/sqlite-core` — they are separate exports. |
| Settings page: checking multiple provider connections | Use one `inArray(integrations.provider, [...])` query + `Set.has()` instead of N separate queries — already the pattern in `settings/page.tsx`. |
| 1Password `op read` with `#` in item name | `#` is invalid in secret references — `op://Vault/#item/field` will error. No workaround via CLI; use `op item get` by item ID instead. |
| 1Password service account vault access | Current `OP_SERVICE_ACCOUNT_TOKEN` only has **Business** vault. Todoist OAuth creds (`TODOIST_CLIENT_ID`, `TODOIST_CLIENT_SECRET`) are in **App Dev** vault → item `#clarity`. See `~/.claude/plans/todoist-env-setup.md`. |
| Turbopack + Tailwind oxide native binding error (`Cannot find native binding`) | Use `npm run dev:stable` (or `npm run dev:auth:stable`) to run webpack mode with `TAILWIND_DISABLE_OXIDE=1`. |
| `supabase/migrations/` naming | Directory is named "supabase" but uses Turso/LibSQL — historical naming, do not rename |
| `npm audit fix` blocked by Tailwind oxide arm64 | Same arm64 conflict blocks all npm installs locally. Use `package.json` `"overrides"` to force patched transitive dep versions instead. |
| Rate limit IP on Vercel | Use `x-real-ip` header (Vercel-trusted, from TCP). `x-forwarded-for` is client-forgeable. `req.ip` was removed from `NextRequest` types in Next.js 15+. |
| API route error responses | Never return `err.message` to client — leaks DB schema/provider internals. Pattern: `console.error("[route] error:", err); return { error: "Internal server error" }` |
| Flex child with long URLs | Add `break-all` to text containers + `min-w-0` to flex children. Unbroken URLs don't wrap by default and push flex items beyond their bounds. |
| Turbopack stale module cache | New `.ts` files may not resolve until dev server restart. If `Cannot find module` for a file that exists, restart dev or use `npm run dev:stable`. |

## Database Tables

23 tables in `src/lib/schema.ts`:

| Table | Purpose |
|-------|---------|
| `user`, `session`, `account`, `verification` | Better Auth core |
| `tasks` | Unified tasks (Todoist, Gmail, manual) |
| `events` | Calendar events (Google) |
| `routines`, `routine_completions` | Habit/routine tracking |
| `routine_costs` | Routine time/cost estimates |
| `integrations` | Encrypted API keys per provider per user |
| `life_context_items`, `life_context_updates` | Life context entries + timeline |
| `context_pins` | Polymorphic links between context items and tasks/emails/events |
| `user_profile` | User preferences |
| `financial_snapshot` | Latest bank balance + monthly burn |
| `plaid_items`, `plaid_accounts` | Plaid Link connections |
| `transactions` | Bank transactions (synced from Plaid) |
| `coach_messages`, `chat_sessions` | AI coach conversation history |
| `emails` | Gmail cache (inbox + starred) |
| `triage_queue` | AI-scored email/task triage items |
| `day_plans` | AI-generated daily plans |

## Design System

Reference: `.interface-design/system.md` (committed to repo).

- **Amber-scarce principle**: Reserve `clarity-amber` tokens for signal moments only (active nav, user chat bubbles, CTAs, empty-state icons)
- **Design tokens**: `--clarity-amber-*` in `globals.css` via `@theme inline` + oklch values
- **Sidebar/canvas**: Flush with canvas (no `bg-muted`) — quiet structure, amber reserved for meaning

## Project Structure

```
clarity/
  src/
    app/
      (auth)/              # Login, signup, callback
      (dashboard)/         # Protected routes
        page.tsx           # Today page (main dashboard)
        calendar/          # Calendar view
        tasks/             # Task hub (filter, create, complete)
        triage/            # AI triage queue
        email/             # Gmail inbox/starred
        spending/          # Transaction views
        life-context/      # Life context manager
        routines/          # Routine builder
        chat/              # AI coach chat
        settings/          # Integrations, profile
        dev/               # Admin dev wiki (user-gated)
        getting-started/   # Onboarding guide
        changelog/         # Version changelog
        profile/           # User profile
      api/
        ai/                # AI coach endpoint
        auth/              # Better Auth handlers
        chat/              # Chat sessions
        cron/              # GH Actions sync endpoint
        emails/            # Gmail cache CRUD
        integrations/      # Provider key management (anthropic, deepseek, groq, gemini, gemini-pro, openweathermap)
        cron/
          sync/            # Every 15 min — Google, Todoist, Gmail, triage
          prune/           # Daily 3am UTC — deletes coach_messages >90d, triage resolved >30d, emails >60d
        profile/           # User profile API
        routine-costs/     # Routine cost estimates CRUD
        life-context/      # Life context CRUD
        plaid/             # Plaid Link + transactions
        spending/          # Spending analytics
        sync/              # Manual sync trigger
        tasks/             # Task CRUD + Todoist write-back
        todoist/           # Todoist OAuth callback
        transactions/      # Transaction queries
        triage/            # Triage scoring + approve/dismiss
        webhooks/          # External webhooks
        widgets/           # Widget data endpoints
    components/
      ui/                  # shadcn components
      dashboard/           # Today page: coach, plan, events, tasks, widgets
      tasks/               # Task hub components
      email/               # Email page components
      spending/            # Spending page components
      life-context/        # Life context components
      settings/            # Settings page components
      triage/              # Triage components
      chat/                # Chat components
      prompt-kit/          # AI chat UI primitives
      dev/                 # Dev wiki components
    lib/
      auth.ts              # Better Auth config (maxPasswordAttempts: 5 — do not remove)
      proxy.ts             # Rate-limiting middleware — called from middleware.ts, NOT middleware.ts itself
      auth-client.ts       # Better Auth browser client
      db.ts                # Turso/LibSQL + Drizzle client
      schema.ts            # Drizzle schema (23 tables)
      crypto.ts            # Token encryption/decryption
      pins.ts              # Shared context pin logic (polymorphic linking)
      ratelimit.ts         # Upstash rate limiter
      sanitize-html.ts     # HTML sanitization utility
      sun-position.ts      # Sun position calculation for time-of-day UI
      utils.ts             # cn() + misc utilities
      ai/                  # AI provider setup + prompts
        client.ts          # Multi-provider client factory (Anthropic, Gemini, DeepSeek, Groq)
        coach.ts           # AI coach streaming logic
        plan-parser.ts     # Day plan parsing utilities
        todoist-tools.ts   # Todoist AI tool definitions
      integrations/        # Google, Todoist adapters
      plaid/               # Plaid client + sync
      sync/                # Sync orchestrator
      triage/              # Triage scoring logic
      use-active-section.ts  # IntersectionObserver hook (rooted on [data-scroll])
      use-safari-toolbar.ts  # Safari mobile toolbar height hook
      use-mobile.ts          # useIsMobile() responsive breakpoint hook
    types/                 # Shared TypeScript types
      triage.ts            # TriageItem type + helpers (cleanTitle, parseSourceMetadata)
  supabase/
    migrations/            # Drizzle-generated SQL (dialect: turso)
  .github/
    workflows/
      sync-cron.yml        # Every 15 min sync via GH Actions
      prune-cron.yml       # Daily 3am UTC data rotation via GH Actions
      update-preview-link.yml  # Auto-update URLsToGo preview link
  .interface-design/
    system.md              # Design system tokens + principles
  docs/                    # Architecture + plan
```

## Documentation

- Architecture: `docs/ARCHITECTURE.md`
- Implementation Plan: `docs/PLAN.md`
- Feature Ideas Backlog: `docs/IDEAS.md` — add here when user says "add to idea list"
- Competitive Analysis & Roadmap: `~/.claude/plans/2026-02-26-clarity-competitive-analysis.md`
- Google Workspace API Research: `~/.claude/plans/zazzy-exploring-mountain.md`
- Design System: `.interface-design/system.md`
- Shared docs: `~/.claude/docs/shadcn-ui.md`, `~/.claude/docs/better-auth.md`
