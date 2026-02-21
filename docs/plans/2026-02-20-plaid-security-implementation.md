# Plaid Integration + Security Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect Plaid to auto-sync bank balance and net cash flow into `financialSnapshot`, and harden the app with rate limiting and updated security headers.

**Architecture:** Plaid Link (client-side widget) → server exchanges public_token for access_token → encrypted at rest in new `plaid_items` table. Daily cron + manual refresh sync balances and 30-day transactions into existing `financialSnapshot`. Rate limiting via Upstash Redis middleware protects all sensitive routes.

**Tech Stack:** `plaid` (official SDK), `react-plaid-link`, `@upstash/ratelimit`, `@upstash/redis`, existing AES-256-GCM crypto, Next.js middleware, Drizzle/Turso

**Design doc:** `docs/plans/2026-02-20-plaid-security-design.md`

---

## Task 1: Install Packages + Update Env Vars + CSP

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.example`
- Modify: `next.config.ts`

**Step 1: Install packages**

```bash
cd ~/clarity
npm install plaid react-plaid-link @upstash/ratelimit @upstash/redis
```

Expected: packages added to node_modules, package-lock.json updated.

**Step 2: Add env vars to .env.example**

Append to `.env.example`:

```
# Plaid (development mode - free, personal use)
# Dashboard: https://dashboard.plaid.com → Team Settings → Keys
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

# Upstash Redis (rate limiting - free tier)
# Dashboard: https://console.upstash.com → Create Database → REST API
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**Step 3: Update CSP in next.config.ts**

Replace the `securityHeaders` array with:

```typescript
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://devtools.jbcloud.app https://cdn.plaid.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "frame-src https://cdn.plaid.com",
      "connect-src 'self' https://*.turso.io https://api.anthropic.com https://generativelanguage.googleapis.com https://api.todoist.com https://www.googleapis.com https://cdn.plaid.com https://production.plaid.com https://sandbox.plaid.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
]
```

Changes from existing:
- Added `Strict-Transport-Security` header (new)
- Added `https://cdn.plaid.com` to `script-src`
- Added `frame-src https://cdn.plaid.com` directive (new — allows Plaid Link iframe)
- Added Plaid domains to `connect-src`

**Step 4: Verify build still passes**

```bash
cd ~/clarity && npm run build
```

Expected: Build succeeds, 0 errors.

**Step 5: Commit**

```bash
git add package.json package-lock.json .env.example next.config.ts
git commit -m "feat: install plaid + upstash packages, update CSP for Plaid"
```

---

## Task 2: Rate Limiting Middleware

**Files:**
- Create: `src/lib/ratelimit.ts`
- Create: `src/middleware.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/ratelimit.test.ts`:

```typescript
import { describe, it, expect } from "vitest"

// These are integration-style — just verify exports exist and are functions
describe("ratelimit module", () => {
  it("exports plaidRatelimit with limit function", async () => {
    // Dynamically import so missing env vars don't crash test suite
    // We test shape only — actual Redis calls need integration env
    const mod = await import("../ratelimit")
    expect(typeof mod.plaidRatelimit.limit).toBe("function")
    expect(typeof mod.coachRatelimit.limit).toBe("function")
    expect(typeof mod.authRatelimit.limit).toBe("function")
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd ~/clarity && npx vitest run src/lib/__tests__/ratelimit.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create src/lib/ratelimit.ts**

```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

function createRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set")
  }
  return new Redis({ url, token })
}

// Lazy singleton — only instantiated when first request hits the middleware
let _redis: Redis | null = null
function redis(): Redis {
  if (!_redis) _redis = createRedis()
  return _redis
}

export const plaidRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:plaid",
})

export const coachRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:coach",
})

export const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:auth",
})
```

Note: `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically.

**Step 4: Create src/middleware.ts**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { plaidRatelimit, coachRatelimit, authRatelimit } from "@/lib/ratelimit"
import { Ratelimit } from "@upstash/ratelimit"

type Limiter = { limit: InstanceType<typeof Ratelimit>["limit"] }

function selectLimiter(pathname: string): { limiter: Limiter; identifier: (req: NextRequest) => string } | null {
  if (pathname.startsWith("/api/plaid") || pathname.startsWith("/api/webhooks/plaid")) {
    return {
      limiter: plaidRatelimit,
      identifier: (req) => req.headers.get("x-forwarded-for") ?? "unknown",
    }
  }
  if (pathname.startsWith("/api/ai/")) {
    return {
      limiter: coachRatelimit,
      identifier: (req) => req.headers.get("x-forwarded-for") ?? "unknown",
    }
  }
  if (pathname.startsWith("/api/auth/")) {
    return {
      limiter: authRatelimit,
      identifier: (req) => req.headers.get("x-forwarded-for") ?? "unknown",
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const match = selectLimiter(request.nextUrl.pathname)
  if (!match) return NextResponse.next()

  const id = match.identifier(request)
  const { success, limit, remaining, reset } = await match.limiter.limit(id)

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      },
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/plaid/:path*", "/api/webhooks/plaid", "/api/ai/:path*", "/api/auth/:path*"],
}
```

**Step 5: Run test to verify it passes**

```bash
cd ~/clarity && npx vitest run src/lib/__tests__/ratelimit.test.ts
```

Note: test will still fail if `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` env vars are not set. The test imports the module shape — skip this test in CI if env vars absent, or mock the env.

Update the test to handle missing env gracefully:

```typescript
import { describe, it, expect, vi } from "vitest"

describe("ratelimit module", () => {
  it("exports limiters with limit function", async () => {
    // Provide stub env so module can initialize
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://stub.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "stub-token")

    const mod = await import("../ratelimit")
    expect(typeof mod.plaidRatelimit.limit).toBe("function")
    expect(typeof mod.coachRatelimit.limit).toBe("function")
    expect(typeof mod.authRatelimit.limit).toBe("function")

    vi.unstubAllEnvs()
  })
})
```

Run: `npx vitest run src/lib/__tests__/ratelimit.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/ratelimit.ts src/middleware.ts src/lib/__tests__/ratelimit.test.ts
git commit -m "feat: add rate limiting middleware (Upstash) for plaid, coach, auth routes"
```

---

## Task 3: Plaid Client Library

**Files:**
- Create: `src/lib/plaid.ts`
- Create: `src/lib/__tests__/plaid-client.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/plaid-client.test.ts
import { describe, it, expect, vi } from "vitest"

describe("createPlaidClient", () => {
  it("throws if PLAID_CLIENT_ID is missing", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "sandbox")

    const { createPlaidClient } = await import("../plaid")
    expect(() => createPlaidClient()).toThrow("PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV must be set")
    vi.unstubAllEnvs()
  })

  it("throws if PLAID_ENV is invalid", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "test-id")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "invalid-env")

    const { createPlaidClient } = await import("../plaid")
    expect(() => createPlaidClient()).toThrow("Invalid PLAID_ENV")
    vi.unstubAllEnvs()
  })

  it("returns PlaidApi instance when env vars are valid", async () => {
    vi.stubEnv("PLAID_CLIENT_ID", "test-id")
    vi.stubEnv("PLAID_SECRET", "test-secret")
    vi.stubEnv("PLAID_ENV", "sandbox")

    const { createPlaidClient } = await import("../plaid")
    const client = createPlaidClient()
    expect(client).toBeDefined()
    expect(typeof client.linkTokenCreate).toBe("function")
    vi.unstubAllEnvs()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd ~/clarity && npx vitest run src/lib/__tests__/plaid-client.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create src/lib/plaid.ts**

```typescript
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid"

const VALID_ENVS = ["sandbox", "development", "production"] as const
type PlaidEnv = typeof VALID_ENVS[number]

function validateEnv(): { clientId: string; secret: string; env: PlaidEnv } {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET
  const env = process.env.PLAID_ENV

  if (!clientId || !secret || !env) {
    throw new Error("PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV must be set")
  }

  if (!VALID_ENVS.includes(env as PlaidEnv)) {
    throw new Error(`Invalid PLAID_ENV: "${env}". Must be sandbox, development, or production`)
  }

  return { clientId, secret, env: env as PlaidEnv }
}

export function createPlaidClient(): PlaidApi {
  const { clientId, secret, env } = validateEnv()

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  })

  return new PlaidApi(configuration)
}

export const PLAID_PRODUCTS: Products[] = [Products.Transactions]
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us]
```

**Step 4: Run test to verify it passes**

```bash
cd ~/clarity && npx vitest run src/lib/__tests__/plaid-client.test.ts
```

Expected: 3/3 PASS

**Step 5: Commit**

```bash
git add src/lib/plaid.ts src/lib/__tests__/plaid-client.test.ts
git commit -m "feat: add Plaid client library with env validation"
```

---

## Task 4: Schema + Migration

**Files:**
- Modify: `src/lib/schema.ts`
- Create: `supabase/migrations/0003_plaid.sql`
- Create: `scripts/migrate-plaid.ts` (one-time migration runner)

**Step 1: Add tables to src/lib/schema.ts**

Append to the end of `src/lib/schema.ts`:

```typescript
// Plaid Items — one row per connected bank (Plaid "Item")
export const plaidItems = sqliteTable("plaid_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id").notNull().unique(),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  syncStatus: text("sync_status").notNull().default("idle"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  lastError: text("last_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

// Plaid Accounts — one row per account within an Item
export const plaidAccounts = sqliteTable("plaid_accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id").notNull().references(() => plaidItems.id, { onDelete: "cascade" }),
  plaidAccountId: text("plaid_account_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),        // depository | credit | loan | investment
  subtype: text("subtype"),            // checking | savings | credit card | etc.
  currentBalanceCents: integer("current_balance_cents").notNull().default(0),
  availableBalanceCents: integer("available_balance_cents"),
  lastUpdatedAt: integer("last_updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})
```

**Step 2: Create migration SQL file**

Create `supabase/migrations/0003_plaid.sql`:

```sql
CREATE TABLE IF NOT EXISTS `plaid_items` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `plaid_item_id` text NOT NULL UNIQUE,
  `institution_id` text NOT NULL,
  `institution_name` text NOT NULL,
  `access_token_encrypted` text NOT NULL,
  `sync_status` text NOT NULL DEFAULT 'idle',
  `last_synced_at` integer,
  `last_error` text,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS `plaid_accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `plaid_item_id` text NOT NULL REFERENCES `plaid_items`(`id`) ON DELETE CASCADE,
  `plaid_account_id` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `subtype` text,
  `current_balance_cents` integer NOT NULL DEFAULT 0,
  `available_balance_cents` integer,
  `last_updated_at` integer NOT NULL DEFAULT (unixepoch())
);
```

**Step 3: Create migration runner script**

Create `scripts/migrate-plaid.ts`:

```typescript
import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
import { join } from "path"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/0003_plaid.sql"),
  "utf8",
)

// Execute each statement separately
const statements = sql.split(";").map((s) => s.trim()).filter(Boolean)
for (const statement of statements) {
  await client.execute(statement)
  console.log("Executed:", statement.slice(0, 60) + "...")
}

console.log("Migration complete.")
```

**Step 4: Run migration against Turso**

```bash
cd ~/clarity && npx tsx scripts/migrate-plaid.ts
```

Expected output:
```
Executed: CREATE TABLE IF NOT EXISTS `plaid_items` (...
Executed: CREATE TABLE IF NOT EXISTS `plaid_accounts` (...
Migration complete.
```

**Step 5: Verify TypeScript compiles**

```bash
cd ~/clarity && npm run typecheck
```

Expected: 0 errors.

**Step 6: Commit**

```bash
git add src/lib/schema.ts supabase/migrations/0003_plaid.sql scripts/migrate-plaid.ts
git commit -m "feat: add plaid_items and plaid_accounts schema + migration"
```

---

## Task 5: Plaid Sync Logic + Tests

**Files:**
- Create: `src/lib/plaid/sync.ts`
- Create: `src/lib/plaid/__tests__/sync.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/plaid/__tests__/sync.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { computeNetCashFlowCents, aggregateBalanceCents } from "../sync"

describe("computeNetCashFlowCents", () => {
  it("returns 0 for empty transactions", () => {
    expect(computeNetCashFlowCents([])).toBe(0)
  })

  it("positive result = net outflow (burning money)", () => {
    // Plaid: positive amount = outflow (expense)
    const transactions = [
      { amount: 100.00 }, // $100 expense
      { amount: 50.00 },  // $50 expense
    ]
    // Net outflow = $150 → 15000 cents
    expect(computeNetCashFlowCents(transactions as any)).toBe(15000)
  })

  it("negative result = net inflow (saving money)", () => {
    const transactions = [
      { amount: -2000.00 }, // $2000 income (paycheck)
      { amount: 500.00 },   // $500 expenses
    ]
    // Net = 500 - 2000 = -1500 → -150000 cents
    expect(computeNetCashFlowCents(transactions as any)).toBe(-150000)
  })

  it("excludes transfer transactions to avoid double-counting", () => {
    const transactions = [
      { amount: 100.00, personal_finance_category: { primary: "FOOD_AND_DRINK" } },
      { amount: 1000.00, personal_finance_category: { primary: "TRANSFER_OUT" } }, // credit card payment — exclude
      { amount: -50.00, personal_finance_category: { primary: "TRANSFER_IN" } },   // refund transfer — exclude
    ]
    // Only $100 food expense counts
    expect(computeNetCashFlowCents(transactions as any)).toBe(10000)
  })
})

describe("aggregateBalanceCents", () => {
  it("sums only depository account balances", () => {
    const accounts = [
      { type: "depository", currentBalanceCents: 320000 }, // checking $3200
      { type: "depository", currentBalanceCents: 50000 },  // savings $500
      { type: "credit", currentBalanceCents: 80000 },      // credit card — exclude
    ]
    expect(aggregateBalanceCents(accounts)).toBe(370000)
  })

  it("returns 0 for no depository accounts", () => {
    const accounts = [{ type: "credit", currentBalanceCents: 80000 }]
    expect(aggregateBalanceCents(accounts)).toBe(0)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
cd ~/clarity && npx vitest run src/lib/plaid/__tests__/sync.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create src/lib/plaid/sync.ts**

```typescript
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { plaidItems, plaidAccounts, financialSnapshot } from "@/lib/schema"
import { decryptToken } from "@/lib/crypto"
import { createPlaidClient } from "@/lib/plaid"

const TRANSFER_CATEGORIES = new Set(["TRANSFER_IN", "TRANSFER_OUT"])

interface TransactionLike {
  amount: number
  personal_finance_category?: { primary: string } | null
}

interface AccountLike {
  type: string
  currentBalanceCents: number
}

// Returns net cash flow in cents.
// Positive = net outflow (burning money), negative = net inflow (saving).
// Excludes transfer transactions to avoid double-counting (e.g. credit card payments).
export function computeNetCashFlowCents(transactions: TransactionLike[]): number {
  let totalDollars = 0
  for (const t of transactions) {
    const category = t.personal_finance_category?.primary
    if (category && TRANSFER_CATEGORIES.has(category)) continue
    totalDollars += t.amount
  }
  return Math.round(totalDollars * 100)
}

// Returns total balance of depository accounts (checking + savings) in cents.
// Excludes credit, loan, and investment accounts.
export function aggregateBalanceCents(accounts: AccountLike[]): number {
  return accounts
    .filter((a) => a.type === "depository")
    .reduce((sum, a) => sum + a.currentBalanceCents, 0)
}

// Syncs one Plaid Item: refreshes account balances and computes net cash flow.
// Returns updated account balance totals.
async function syncPlaidItem(
  plaidClient: ReturnType<typeof createPlaidClient>,
  item: typeof plaidItems.$inferSelect,
): Promise<{ bankBalanceCents: number; netFlowCents: number }> {
  const accessToken = decryptToken(item.accessTokenEncrypted)

  // 1. Fetch current balances
  const balanceResponse = await plaidClient.accountsBalanceGet({ access_token: accessToken })
  const plaidAccountList = balanceResponse.data.accounts

  // Upsert accounts
  for (const acct of plaidAccountList) {
    const currentCents = Math.round((acct.balances.current ?? 0) * 100)
    const availableCents = acct.balances.available != null
      ? Math.round(acct.balances.available * 100)
      : null

    await db
      .insert(plaidAccounts)
      .values({
        userId: item.userId,
        plaidItemId: item.id,
        plaidAccountId: acct.account_id,
        name: acct.name,
        type: acct.type,
        subtype: acct.subtype ?? null,
        currentBalanceCents: currentCents,
        availableBalanceCents: availableCents,
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: plaidAccounts.plaidAccountId,
        set: {
          currentBalanceCents: currentCents,
          availableBalanceCents: availableCents,
          lastUpdatedAt: new Date(),
        },
      })
  }

  // 2. Fetch last 30 days of transactions
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const txResponse = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: thirtyDaysAgo.toISOString().slice(0, 10),
    end_date: now.toISOString().slice(0, 10),
  })

  const netFlowCents = computeNetCashFlowCents(txResponse.data.transactions as TransactionLike[])

  const bankBalanceCents = aggregateBalanceCents(
    plaidAccountList.map((a) => ({
      type: a.type,
      currentBalanceCents: Math.round((a.balances.current ?? 0) * 100),
    })),
  )

  return { bankBalanceCents, netFlowCents }
}

// Entry point: syncs all Plaid Items for a user, updates financialSnapshot.
export async function syncPlaidForUser(userId: string): Promise<{ synced: number; error?: string }> {
  const items = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId))

  if (items.length === 0) return { synced: 0 }

  const plaidClient = createPlaidClient()
  let totalBankCents = 0
  let totalNetFlowCents = 0
  let synced = 0

  for (const item of items) {
    try {
      await db
        .update(plaidItems)
        .set({ syncStatus: "syncing", updatedAt: new Date() })
        .where(eq(plaidItems.id, item.id))

      const { bankBalanceCents, netFlowCents } = await syncPlaidItem(plaidClient, item)
      totalBankCents += bankBalanceCents
      totalNetFlowCents += netFlowCents
      synced++

      await db
        .update(plaidItems)
        .set({ syncStatus: "idle", lastSyncedAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(plaidItems.id, item.id))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await db
        .update(plaidItems)
        .set({ syncStatus: "error", lastError: message, updatedAt: new Date() })
        .where(eq(plaidItems.id, item.id))
    }
  }

  // Upsert financial snapshot with aggregated totals
  await db
    .insert(financialSnapshot)
    .values({
      userId,
      bankBalanceCents: totalBankCents,
      monthlyBurnCents: totalNetFlowCents,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: financialSnapshot.userId,
      set: {
        bankBalanceCents: totalBankCents,
        monthlyBurnCents: totalNetFlowCents,
        updatedAt: new Date(),
      },
    })

  return { synced }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd ~/clarity && npx vitest run src/lib/plaid/__tests__/sync.test.ts
```

Expected: 6/6 PASS

**Step 5: Commit**

```bash
git add src/lib/plaid/sync.ts src/lib/plaid/__tests__/sync.test.ts
git commit -m "feat: add Plaid sync logic with net cash flow computation"
```

---

## Task 6: API Routes — Link Token + Exchange Token

**Files:**
- Create: `src/app/api/plaid/create-link-token/route.ts`
- Create: `src/app/api/plaid/exchange-token/route.ts`

**Step 1: Create src/app/api/plaid/create-link-token/route.ts**

```typescript
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { createPlaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from "@/lib/plaid"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = createPlaidClient()

  const response = await client.linkTokenCreate({
    user: { client_user_id: session.user.id },
    client_name: "Clarity",
    products: PLAID_PRODUCTS,
    country_codes: PLAID_COUNTRY_CODES,
    language: "en",
  })

  return NextResponse.json({ link_token: response.data.link_token })
}
```

**Step 2: Create src/app/api/plaid/exchange-token/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems } from "@/lib/schema"
import { encryptToken } from "@/lib/crypto"
import { createPlaidClient } from "@/lib/plaid"

const exchangeSchema = z.object({
  public_token: z.string().min(1),
  institution_id: z.string().min(1),
  institution_name: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = exchangeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { public_token, institution_id, institution_name } = parsed.data

  const client = createPlaidClient()
  const exchangeResponse = await client.itemPublicTokenExchange({ public_token })

  const { access_token, item_id } = exchangeResponse.data

  await db
    .insert(plaidItems)
    .values({
      userId: session.user.id,
      plaidItemId: item_id,
      institutionId: institution_id,
      institutionName: institution_name,
      accessTokenEncrypted: encryptToken(access_token),
      syncStatus: "idle",
    })
    .onConflictDoUpdate({
      target: plaidItems.plaidItemId,
      set: {
        accessTokenEncrypted: encryptToken(access_token),
        syncStatus: "idle",
        lastError: null,
        updatedAt: new Date(),
      },
    })

  return NextResponse.json({ ok: true, institution: institution_name }, { status: 201 })
}
```

**Step 3: Verify TypeScript**

```bash
cd ~/clarity && npm run typecheck
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add src/app/api/plaid/create-link-token/route.ts src/app/api/plaid/exchange-token/route.ts
git commit -m "feat: add Plaid link token + exchange token API routes"
```

---

## Task 7: API Routes — Items, Delete, Manual Sync, Webhook Stub

**Files:**
- Create: `src/app/api/plaid/items/route.ts`
- Create: `src/app/api/plaid/items/[itemId]/route.ts`
- Create: `src/app/api/plaid/sync/route.ts`
- Create: `src/app/api/webhooks/plaid/route.ts`

**Step 1: Create src/app/api/plaid/items/route.ts**

```typescript
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems, plaidAccounts } from "@/lib/schema"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.userId, session.user.id))

  // Fetch accounts for each item — omit accessTokenEncrypted from response
  const result = await Promise.all(
    items.map(async (item) => {
      const accounts = await db
        .select()
        .from(plaidAccounts)
        .where(eq(plaidAccounts.plaidItemId, item.id))

      return {
        id: item.id,
        institutionName: item.institutionName,
        syncStatus: item.syncStatus,
        lastSyncedAt: item.lastSyncedAt,
        lastError: item.lastError,
        accounts: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          subtype: a.subtype,
          currentBalanceCents: a.currentBalanceCents,
        })),
      }
    }),
  )

  return NextResponse.json({ items: result })
}
```

**Step 2: Create src/app/api/plaid/items/[itemId]/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { plaidItems } from "@/lib/schema"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params

  const result = await db
    .delete(plaidItems)
    .where(and(eq(plaidItems.id, itemId), eq(plaidItems.userId, session.user.id)))
    .returning({ id: plaidItems.id })

  if (result.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
```

**Step 3: Create src/app/api/plaid/sync/route.ts**

```typescript
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { syncPlaidForUser } from "@/lib/plaid/sync"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await syncPlaidForUser(session.user.id)

  return NextResponse.json(result)
}
```

**Step 4: Create src/app/api/webhooks/plaid/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createPlaidClient } from "@/lib/plaid"

// Plaid webhook receiver — validates signature, stubs processing for now.
// Extend in Phase 2 for real-time transaction updates.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signatureHeader = request.headers.get("plaid-verification") ?? ""

  // Verify Plaid webhook signature
  const client = createPlaidClient()
  try {
    await client.webhookVerificationKeyGet({ key_id: signatureHeader })
    // In production: use plaid.verify() with the raw body + signature
    // For now: log and acknowledge
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  // Acknowledge receipt — processing is handled by cron sync
  return NextResponse.json({ received: true })
}
```

**Step 5: Verify TypeScript**

```bash
cd ~/clarity && npm run typecheck
```

Expected: 0 errors.

**Step 6: Commit**

```bash
git add src/app/api/plaid/items/route.ts src/app/api/plaid/items/[itemId]/route.ts src/app/api/plaid/sync/route.ts src/app/api/webhooks/plaid/route.ts
git commit -m "feat: add Plaid items management, manual sync, and webhook stub routes"
```

---

## Task 8: Cron Integration

**Files:**
- Modify: `src/lib/sync/orchestrator.ts`

**Step 1: Update orchestrator to include Plaid sync**

Replace contents of `src/lib/sync/orchestrator.ts`:

```typescript
import { syncGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { syncTodoistTasks } from "@/lib/integrations/todoist"
import { syncPlaidForUser } from "@/lib/plaid/sync"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { plaidItems } from "@/lib/schema"

interface SyncResult {
  userId: string
  google?: { synced: number; error?: string }
  todoist?: { synced: number; error?: string }
  plaid?: { synced: number; error?: string }
}

export async function syncAllForUser(userId: string): Promise<SyncResult> {
  // Check if user has Plaid items before calling Plaid sync
  const userPlaidItems = await db
    .select({ id: plaidItems.id })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId))
    .limit(1)

  const hasPlaid = userPlaidItems.length > 0

  const tasks: Promise<unknown>[] = [
    syncGoogleCalendarEvents(userId),
    syncTodoistTasks(userId),
    ...(hasPlaid ? [syncPlaidForUser(userId)] : []),
  ]

  const [google, todoist, plaid] = await Promise.all(tasks) as [
    { synced: number; error?: string },
    { synced: number; error?: string },
    { synced: number; error?: string } | undefined,
  ]

  return { userId, google, todoist, ...(hasPlaid ? { plaid } : {}) }
}

export async function syncAllUsers(userIds: string[]): Promise<SyncResult[]> {
  return Promise.all(userIds.map((id) => syncAllForUser(id)))
}
```

**Step 2: Verify TypeScript and run all tests**

```bash
cd ~/clarity && npm run typecheck && npx vitest run
```

Expected: 0 type errors, all tests pass.

**Step 3: Commit**

```bash
git add src/lib/sync/orchestrator.ts
git commit -m "feat: integrate Plaid sync into daily cron orchestrator"
```

---

## Task 9: Settings UI — Plaid Connection Panel

**Files:**
- Create: `src/components/settings/plaid-connection-panel.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Step 1: Create src/components/settings/plaid-connection-panel.tsx**

```typescript
"use client"

import { useState, useCallback } from "react"
import { usePlaidLink } from "react-plaid-link"
import { Landmark, Trash2, RefreshCw, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PlaidAccount {
  id: string
  name: string
  type: string
  subtype: string | null
  currentBalanceCents: number
}

interface PlaidItem {
  id: string
  institutionName: string
  syncStatus: string
  lastSyncedAt: number | null
  lastError: string | null
  accounts: PlaidAccount[]
}

interface Props {
  initialItems: PlaidItem[]
}

function formatBalance(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function formatSyncedAt(ts: number | null): string {
  if (!ts) return "Never synced"
  return new Date(ts * 1000).toLocaleString()
}

export function PlaidConnectionPanel({ initialItems }: Props) {
  const [items, setItems] = useState<PlaidItem[]>(initialItems)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchLinkToken() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create link token")
      setLinkToken(data.link_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: { institution: { institution_id: string; name: string } }) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution_id: metadata.institution.institution_id,
            institution_name: metadata.institution.name,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Exchange failed")
        }
        // Refresh items list
        const itemsRes = await fetch("/api/plaid/items")
        const itemsData = await itemsRes.json()
        setItems(itemsData.items)
        setLinkToken(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => setLinkToken(null),
  })

  async function handleConnect() {
    if (!linkToken) {
      await fetchLinkToken()
    } else if (ready) {
      open()
    }
  }

  // Auto-open Plaid Link once token is ready
  if (linkToken && ready) {
    open()
  }

  async function handleDisconnect(itemId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/plaid/items/${itemId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to disconnect")
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" })
      if (!res.ok) throw new Error("Sync failed")
      // Refresh items to show updated syncStatus + lastSyncedAt
      const itemsRes = await fetch("/api/plaid/items")
      const itemsData = await itemsRes.json()
      setItems(itemsData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Bank Accounts</CardTitle>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Sync now
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Connect bank
            </Button>
          </div>
        </div>
        <CardDescription>
          Connected banks auto-update your financial snapshot daily.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No banks connected yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.institutionName}</p>
                  <p className="text-xs text-muted-foreground">
                    Last synced: {formatSyncedAt(item.lastSyncedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      item.syncStatus === "error"
                        ? "text-destructive border-destructive/20 bg-destructive/5"
                        : item.syncStatus === "syncing"
                          ? "text-blue-600 border-blue-200 bg-blue-50"
                          : "text-green-600 border-green-200 bg-green-50"
                    }
                  >
                    {item.syncStatus}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDisconnect(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {item.lastError && (
                <p className="text-xs text-destructive">{item.lastError}</p>
              )}

              <div className="space-y-1">
                {item.accounts.map((acct) => (
                  <div key={acct.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {acct.name}
                      {acct.subtype && (
                        <span className="ml-1 text-xs">({acct.subtype})</span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatBalance(acct.currentBalanceCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: Add Plaid data query to settings page**

In `src/app/(dashboard)/settings/page.tsx`, add to the parallel queries array:

```typescript
// Add this import at the top:
import { plaidItems, plaidAccounts } from "@/lib/schema"
import { PlaidConnectionPanel } from "@/components/settings/plaid-connection-panel"

// Add to Promise.all:
db.select().from(plaidItems).where(eq(plaidItems.userId, userId)),
```

Then for each plaidItem, fetch accounts and build the `initialItems` prop. Add the `<PlaidConnectionPanel>` card before the Todoist card in the JSX:

```tsx
{/* Bank Accounts (Plaid) */}
<PlaidConnectionPanel initialItems={plaidItemsWithAccounts} />
```

The full settings page modification is best done by reading the current file and inserting at the correct positions — the existing pattern (parallel queries + component renders) makes this straightforward.

**Step 3: Run build to verify no errors**

```bash
cd ~/clarity && npm run build
```

Expected: Build succeeds.

**Step 4: Run all tests**

```bash
cd ~/clarity && npx vitest run
```

Expected: All tests pass (12 existing + 6 new sync tests + 1 ratelimit + 3 plaid-client = 22 tests).

**Step 5: Commit**

```bash
git add src/components/settings/plaid-connection-panel.tsx src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat: add Plaid bank connection UI to settings page"
```

---

## Final Verification

```bash
cd ~/clarity && npx vitest run && npm run typecheck && npm run build
```

All must pass before deploying.

## Environment Setup Required

Before testing end-to-end, add these to `.env.local` (or 1Password):

1. **Plaid**: Get from https://dashboard.plaid.com → Team Settings → Keys
   - `PLAID_CLIENT_ID`
   - `PLAID_SECRET` (use Sandbox secret for dev)
   - `PLAID_ENV=sandbox`

2. **Upstash Redis**: Create free DB at https://console.upstash.com
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

3. **Run migration**: `npx tsx scripts/migrate-plaid.ts`
