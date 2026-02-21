# Plaid Integration + Security Hardening — Feature Design

**Date:** 2026-02-20
**Status:** Approved

## Problem

The `financialSnapshot` table is populated manually. Burn rate and bank balance go stale
immediately. The AI coach's runway calculation is only as good as the last time the user
remembered to update it.

## Solution

Connect Plaid (development mode, free, personal use only) to auto-sync balance and net
cash flow into `financialSnapshot` daily and on demand. Simultaneously harden the app's
security posture before storing bank-linked credentials.

## Constraints

- Plaid development mode only — personal use, up to 100 Items, free forever
- Multiple accounts: checking, savings, credit cards
- Burn rate = net cash flow (income − expenses over 30 days); negative = burning
- Sync: daily cron + manual refresh button; no webhooks needed now

---

## Plaid Token Flow

Plaid's 3-step handshake. The access token never reaches the client.

```
1. Client → POST /api/plaid/create-link-token
          ← server creates link_token via Plaid API, returns to client

2. Client opens Plaid Link widget (bank OAuth)
          ← Plaid calls client callback with short-lived public_token

3. Client → POST /api/plaid/exchange-token { public_token }
          → server exchanges for permanent access_token + item_id
          → access_token encrypted (AES-256-GCM, existing crypto.ts) + stored in DB
          ← client receives only institution name + account list (no token)
```

---

## Data Model

### `plaid_items`

One row per bank connection (Plaid "Item").

| Column | Type | Notes |
|--------|------|-------|
| id | text (uuid) | PK |
| userId | text | FK → user, cascade |
| plaidItemId | text | Plaid's Item ID, unique |
| institutionId | text | Plaid institution ID |
| institutionName | text | "Chase", "Wells Fargo", etc. |
| accessTokenEncrypted | text | AES-256-GCM via crypto.ts |
| syncStatus | text | idle / syncing / error |
| lastSyncedAt | datetime | nullable |
| lastError | text | nullable |
| createdAt | datetime | |
| updatedAt | datetime | |

### `plaid_accounts`

One row per account within an Item.

| Column | Type | Notes |
|--------|------|-------|
| id | text (uuid) | PK |
| userId | text | FK → user, cascade |
| plaidItemId | text | FK → plaid_items, cascade |
| plaidAccountId | text | Plaid account ID, unique |
| name | text | "Freedom Checking" |
| type | text | depository / credit / loan / investment |
| subtype | text | checking / savings / credit card / etc. |
| currentBalanceCents | integer | |
| availableBalanceCents | integer | nullable |
| lastUpdatedAt | datetime | |

Transactions are **not stored** — pulled on sync, used to compute net cash flow, discarded.

---

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/plaid/create-link-token | Create Plaid Link token (session auth) |
| POST | /api/plaid/exchange-token | Exchange public_token → store encrypted access_token |
| GET | /api/plaid/items | List connected banks + account summaries |
| DELETE | /api/plaid/items/[itemId] | Disconnect a bank |
| POST | /api/plaid/sync | Manual refresh trigger |
| POST | /api/webhooks/plaid | Webhook receiver (signature-verified, stub for now) |

The existing `/api/cron/sync` route gets a new Plaid sync step added after
Google Calendar + Todoist sync.

---

## Sync Logic

```
For each plaid_item (user):
  1. plaid.accountsBalanceGet()   → update plaid_accounts.currentBalanceCents
  2. plaid.transactionsGet(30d)   → compute net cash flow

Aggregate:
  bankBalanceCents = SUM(currentBalanceCents) where type = "depository"
  monthlyBurnCents = total_income_30d − total_expenses_30d
                     (negative = burning, positive = saving)

Upsert → financialSnapshot (existing table, existing coach prompt reads it unchanged)
```

No changes to Life Context strip or coach prompt — they already read `financialSnapshot`.

---

## Security Hardening

### Layer 1 — Plaid-specific

- Access token: server-only, never in any API response or log
- Encrypted at rest: AES-256-GCM via existing `src/lib/crypto.ts`
- Webhook signature: verify `plaid-verification-id` header using Plaid SDK
- Env var guard: module-level check throws on startup if `PLAID_CLIENT_ID`,
  `PLAID_SECRET`, or `PLAID_ENV` are missing

### Layer 2 — Rate limiting

Implementation: `@upstash/ratelimit` + `@upstash/redis` (free tier, 10k commands/day).

| Route pattern | Limit | Window |
|---------------|-------|--------|
| /api/plaid/* | 20 req | per user / min |
| /api/ai/coach | 30 req | per user / min |
| /api/auth/* | 10 req | per IP / min |

Applied in Next.js middleware before route handlers run.

### Layer 3 — Security headers

Added via `next.config.ts` headers array (applied globally):

- `Content-Security-Policy` — restrict script/style/connect/frame sources
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## Out of Scope (This Version)

- Storing individual transactions long-term
- Budget categories or spending breakdowns
- Loan / investment account balances in coach context
- Plaid webhooks for real-time updates (future Phase 2)
- Production Plaid mode (stays in dev mode, personal use only)
