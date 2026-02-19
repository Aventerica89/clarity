# Clarity — CLAUDE.md

## Project Overview

**Clarity** is a personal productivity hub for 2-3 users (owner + family). It unifies Google Calendar, Todoist, Gmail, Apple Reminders, Apple Calendar, Apple Notes, and Apple Mail into one AI-prioritized daily view with routines and smart reminders.

**Core killer feature:** Ask "What should I do right now?" — Claude reads all your tasks, events, and context to give a specific, actionable answer. No more paralysis from long lists.

## Stack

| Layer | Technology |
|-------|-----------|
| Web app | Next.js 15 (App Router) |
| Database | Turso (LibSQL via Drizzle ORM) |
| Auth | Better Auth (Google OAuth + email/password) |
| Hosting | Vercel (+ Vercel Cron for sync) |
| UI | Tailwind CSS + shadcn/ui + Lucide icons |
| AI | Claude API (Haiku for batch scoring, Sonnet for "What now?" coach) |
| Apple bridge | clarity-companion (local Node.js AppleScript process on each Mac) |
| Mobile | Expo (React Native) — Phase 5 |

## Architecture

```
Browser (Vercel) <-> Turso (LibSQL/Drizzle)
                          ^
Mac companion ------> Turso via Vercel API (Apple data push)
Google APIs --------> Vercel API routes (sync cron)
Todoist API --------> Vercel API routes (sync cron)
Claude API ---------> Vercel API routes (AI coach + scoring)
```

**Mac companion** (`clarity-companion/`): Small Bun/Node.js process on each Mac. Uses AppleScript to read Apple Reminders, Calendar, Notes, Mail. Runs on a schedule and pushes data via Vercel API. Uses same auth session.

## Documentation

- Architecture: `docs/ARCHITECTURE.md`
- Implementation Plan: `docs/PLAN.md`
- Shared docs: `~/.claude/docs/shadcn-ui.md`, `~/.claude/docs/better-auth.md`

## Key Integrations

| Provider | Method | Data |
|----------|--------|------|
| Google Calendar | REST API + OAuth | Events (read) |
| Gmail | REST API + OAuth | Flagged emails -> tasks |
| Todoist | REST API (token) | Tasks (read/write) |
| Apple Reminders | AppleScript (companion) | Reminders (read/write) |
| Apple Calendar | AppleScript (companion) | Events (read) |
| Apple Notes | AppleScript (companion) | Notes (read) |
| Apple Mail | AppleScript (companion) | Flagged emails (read) |

## Environment Variables

See `.env.example` for full list. Use `npm run env:inject` to populate from 1Password.

## Important Rules

### Anthropic OAuth
- NEVER use `@ai-sdk/anthropic` for AI calls — it doesn't support OAuth tokens
- ALWAYS use `@anthropic-ai/sdk` directly
- Pattern: `token.startsWith('sk-ant-oat') ? new Anthropic({ authToken: token }) : new Anthropic({ apiKey: token })`

### Data Access
- ALWAYS use Drizzle ORM with Turso client (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)
- NEVER expose `TURSO_AUTH_TOKEN` to client code — server/API routes only
- ALWAYS filter by `userId` in queries (no RLS — enforced in application layer)

### Apple companion
- Never store Apple app-specific passwords in Supabase
- Companion authenticates to the web API using the user's Better Auth session
- Companion runs on user's Mac only, no cloud deployment

### Vercel Cron
- Current schedule: `0 0 * * *` (daily) — limited by Hobby plan
- Intended schedule: `*/5 * * * *` (every 5 min) — requires Vercel Pro upgrade

## Commands

| Command | Purpose |
|---------|---------|
| `/tdd` | Start TDD workflow |
| `/commit` | Create conventional commit |
| `/code-review` | Review code |
| `/deploy-check` | Pre-deployment checklist |
| `/jbdocs` | Sync to docs.jbcloud.app |

## Project Structure

```
clarity/
  src/
    app/
      (auth)/          # Login, signup, callback
      (dashboard)/     # Protected app routes
      api/             # API routes
    components/
      ui/              # shadcn components
      dashboard/       # Daily view, task/event cards
      routines/        # Routine builder
      settings/        # Connection cards, sync status
    lib/
      auth.ts          # Better Auth config
      db.ts            # Supabase client
      integrations/    # Google, Todoist, Apple adapters
      ai/              # Claude scoring + coach
      sync/            # Orchestrator
      routines/        # Streak engine
    types/             # Shared TypeScript types
  clarity-companion/   # Local Mac AppleScript bridge
  supabase/
    migrations/        # SQL migrations
  docs/                # Architecture + plan
  tests/               # Unit, integration, e2e
```
