# Clarity — Architecture Codemap
_Updated: 2026-03-29_

## Overview

Personal productivity hub (2-3 users). Next.js 16 App Router, Turso/LibSQL via Drizzle, Better Auth, Vercel hosting, GitHub Actions cron.

## Request Flow

```
Browser → middleware.ts (rate-limit proxy)
       → (auth)/ pages       — login, OAuth callback
       → (dashboard)/ pages  — protected client components
       → /api/* routes       — server actions, Drizzle queries
       → Turso (LibSQL)      — single DB, userId-filtered

External:
  GH Actions → /api/cron/sync   (daily 7am Phoenix)
  GH Actions → /api/cron/prune  (daily 3am UTC)
  Google APIs / Todoist / Plaid → sync routes
  AI providers (Anthropic → DeepSeek → Groq → Gemini)
  Companion (MacBook) → /api/companion/* (Apple Reminders sync)
```

## Key Architectural Rules

- No RLS — all queries filter by `userId` in application layer
- All API POST/PATCH bodies validated with Zod `safeParse()`
- AI tokens encrypted at rest via `TOKEN_ENCRYPTION_KEY`
- Rate limiting via Upstash Redis (`src/lib/ratelimit.ts`)
- Timezone: `America/Phoenix` (no DST), override via `CLARITY_TIMEZONE`
- `--input` CSS token: `oklch(1 0 0 / 15%)` dark — do not override per-component

## Auth

- Better Auth (`src/lib/auth.ts`) — Google OAuth + email/password
- `maxPasswordAttempts: 5` — do not remove
- Session via `auth.api.getSession({ headers })` in API routes
- Client: `src/lib/auth-client.ts`

## Middleware

```
src/middleware.ts       — Next.js entry, imports proxy + inlines config
src/lib/proxy.ts        — rate-limiting + auth guard logic
src/lib/companion-auth.ts — CRON_SECRET-based auth for companion API routes
```

## Companion Process (`companion/`)

Local Node.js process on macOS. Polls Clarity API every 60s, creates Apple Reminders via AppleScript/JXA.

```
companion/src/index.ts       — Entry point
companion/src/config.ts      — Env: CLARITY_API_URL, COMPANION_TOKEN
companion/src/api-client.ts  — HTTP client (Bearer auth via CRON_SECRET)
companion/src/scheduler.ts   — Poll loop, hash-based change detection
companion/src/apple/reminders.ts — Create/delete reminders in "Clarity" list
companion/src/apple/utils.ts — osascript + JXA execution helpers
```

Runs as launchd service (`com.clarity.companion.plist`). Install: `companion/scripts/install.sh`.
