# Clarity — Architecture Codemap
_Updated: 2026-03-16_

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
  GH Actions → /api/cron/sync   (every 15 min)
  GH Actions → /api/cron/prune  (daily 3am UTC)
  Google APIs / Todoist / Plaid → sync routes
  AI providers (Anthropic → DeepSeek → Groq → Gemini)
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
src/middleware.ts       — Next.js entry (re-exports src/lib/proxy.ts)
src/lib/proxy.ts        — rate-limiting + auth guard logic
```
