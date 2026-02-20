# Life Context — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Life Context layer to Clarity — free-text situation cards + a financial snapshot — that the AI coach reads to re-rank tasks and explain its reasoning.

**Architecture:** Two new DB tables (`life_context_items`, `financial_snapshot`) feed into `buildContext()` in the coach module. The coach system prompt is updated to explain reasoning when Life Context drives prioritization. A new `/life-context` management page and a collapsible strip on Today provide the UI.

**Tech Stack:** Next.js App Router, Drizzle ORM + Turso (LibSQL), Zod validation, shadcn/ui, Vitest for tests.

**Design doc:** `docs/plans/2026-02-20-life-context-design.md`

---

## Task 1: Add schema tables

**Files:**
- Modify: `src/lib/schema.ts`

**Step 1: Add two tables at the end of schema.ts**

```typescript
// Life Context — free-text situation cards
export const lifeContextItems = sqliteTable("life_context_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  urgency: text("urgency").notNull().default("active"), // "active" | "critical"
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

// Financial snapshot — one row per user, updated manually
export const financialSnapshot = sqliteTable("financial_snapshot", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  bankBalanceCents: integer("bank_balance_cents").notNull().default(0),
  monthlyBurnCents: integer("monthly_burn_cents").notNull().default(0),
  notes: text("notes"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})
```

**Step 2: Generate and push the migration**

```bash
cd ~/clarity
npx drizzle-kit generate
npx drizzle-kit push
```

Expected: Two new migration files created, tables pushed to Turso.

**Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

```bash
git add src/lib/schema.ts supabase/migrations/
git commit -m "feat: add life_context_items and financial_snapshot schema tables"
```

---

## Task 2: Life Context CRUD API

**Files:**
- Create: `src/app/api/life-context/route.ts`
- Create: `src/app/api/life-context/[id]/route.ts`

### `src/app/api/life-context/route.ts` — GET all + POST create

```typescript
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems } from "@/lib/schema"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  urgency: z.enum(["active", "critical"]).default("active"),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await db
    .select()
    .from(lifeContextItems)
    .where(and(eq(lifeContextItems.userId, session.user.id), eq(lifeContextItems.isActive, true)))
    .orderBy(desc(lifeContextItems.urgency), desc(lifeContextItems.createdAt))

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const [item] = await db
    .insert(lifeContextItems)
    .values({ userId: session.user.id, ...parsed.data })
    .returning()

  return NextResponse.json({ item }, { status: 201 })
}
```

### `src/app/api/life-context/[id]/route.ts` — PATCH + DELETE

```typescript
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems } from "@/lib/schema"

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  urgency: z.enum(["active", "critical"]).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body: unknown = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const now = new Date()
  const [updated] = await db
    .update(lifeContextItems)
    .set({ ...parsed.data, updatedAt: now })
    .where(and(eq(lifeContextItems.id, id), eq(lifeContextItems.userId, session.user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ item: updated })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const now = new Date()

  await db
    .update(lifeContextItems)
    .set({ isActive: false, updatedAt: now })
    .where(and(eq(lifeContextItems.id, id), eq(lifeContextItems.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
```

**Step: Typecheck**

```bash
npx tsc --noEmit
```

**Step: Commit**

```bash
git add src/app/api/life-context/
git commit -m "feat: add life context CRUD API routes"
```

---

## Task 3: Financial Snapshot API

**Files:**
- Create: `src/app/api/life-context/financial/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { financialSnapshot } from "@/lib/schema"

const updateSchema = z.object({
  bankBalanceCents: z.number().int().min(0),
  monthlyBurnCents: z.number().int().min(0),
  notes: z.string().max(500).nullable().optional(),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(financialSnapshot)
    .where(eq(financialSnapshot.userId, session.user.id))
    .limit(1)

  return NextResponse.json({ snapshot: rows[0] ?? null })
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body: unknown = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const now = new Date()
  const [snapshot] = await db
    .insert(financialSnapshot)
    .values({ userId: session.user.id, ...parsed.data, updatedAt: now })
    .onConflictDoUpdate({
      target: [financialSnapshot.userId],
      set: { ...parsed.data, updatedAt: now },
    })
    .returning()

  return NextResponse.json({ snapshot })
}
```

**Step: Typecheck**

```bash
npx tsc --noEmit
```

**Step: Commit**

```bash
git add src/app/api/life-context/financial/
git commit -m "feat: add financial snapshot API route"
```

---

## Task 4: Coach context + prompt update (TDD)

**Files:**
- Create: `src/lib/ai/__tests__/coach.test.ts`
- Modify: `src/lib/ai/coach.ts`
- Modify: `src/lib/ai/prompts.ts`

**Step 1: Write failing tests**

Create `src/lib/ai/__tests__/coach.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { formatLifeContext } from "../coach"

describe("formatLifeContext", () => {
  it("returns empty string when no items and no snapshot", () => {
    expect(formatLifeContext([], null)).toBe("")
  })

  it("formats a critical item with CRITICAL label", () => {
    const result = formatLifeContext(
      [{ title: "Fix motorcycle", description: "Blocking move", urgency: "critical" as const }],
      null,
    )
    expect(result).toContain("CRITICAL: Fix motorcycle")
    expect(result).toContain("Blocking move")
  })

  it("formats an active item with ACTIVE label", () => {
    const result = formatLifeContext(
      [{ title: "Job hunting", description: "Need RV hookup", urgency: "active" as const }],
      null,
    )
    expect(result).toContain("ACTIVE: Job hunting")
  })

  it("formats financial snapshot with computed runway in months", () => {
    const result = formatLifeContext([], {
      bankBalanceCents: 320000, // $3,200
      monthlyBurnCents: 140000, // $1,400
      notes: null,
    })
    expect(result).toContain("Bank: $3,200")
    expect(result).toContain("Burn: $1,400/mo")
    expect(result).toContain("~2.3 months")
  })

  it("orders critical items before active items", () => {
    const result = formatLifeContext(
      [
        { title: "Job hunting", description: "", urgency: "active" as const },
        { title: "Fix motorcycle", description: "", urgency: "critical" as const },
      ],
      null,
    )
    expect(result.indexOf("CRITICAL")).toBeLessThan(result.indexOf("ACTIVE"))
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
cd ~/clarity && npx vitest run src/lib/ai/__tests__/coach.test.ts
```

Expected: FAIL — `formatLifeContext` not exported.

**Step 3: Add `formatLifeContext` to coach.ts and update `buildContext`**

Add this exported function to `src/lib/ai/coach.ts` (import `lifeContextItems` and `financialSnapshot` from schema):

```typescript
import { lifeContextItems, financialSnapshot } from "@/lib/schema"

type LifeContextItem = { title: string; description: string; urgency: "active" | "critical" }
type FinancialSnap = { bankBalanceCents: number; monthlyBurnCents: number; notes: string | null } | null

export function formatLifeContext(items: LifeContextItem[], snap: FinancialSnap): string {
  if (items.length === 0 && !snap) return ""

  const lines: string[] = ["[Life Context]"]

  const sorted = [...items].sort((a, b) => (a.urgency === "critical" ? -1 : 1))
  for (const item of sorted) {
    const label = item.urgency === "critical" ? "CRITICAL" : "ACTIVE"
    lines.push(`${label}: ${item.title}${item.description ? ` — ${item.description}` : ""}`)
  }

  if (snap && (snap.bankBalanceCents > 0 || snap.monthlyBurnCents > 0)) {
    lines.push("")
    lines.push("[Financial Context]")
    const bank = (snap.bankBalanceCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })
    const burn = (snap.monthlyBurnCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })
    const runway = snap.monthlyBurnCents > 0
      ? (snap.bankBalanceCents / snap.monthlyBurnCents).toFixed(1)
      : null
    const runwayStr = runway ? ` | Runway: ~${runway} months` : ""
    lines.push(`Bank: $${bank} | Burn: $${burn}/mo${runwayStr}`)
    if (snap.notes) lines.push(`Note: ${snap.notes}`)
  }

  return lines.join("\n")
}
```

Then update `buildContext()` to fetch and prepend life context. Add this to the `Promise.all` array:

```typescript
// Inside buildContext(), add to the Promise.all:
db
  .select({ title: lifeContextItems.title, description: lifeContextItems.description, urgency: lifeContextItems.urgency })
  .from(lifeContextItems)
  .where(and(eq(lifeContextItems.userId, userId), eq(lifeContextItems.isActive, true)))
  .orderBy(desc(lifeContextItems.urgency)),

db
  .select({ bankBalanceCents: financialSnapshot.bankBalanceCents, monthlyBurnCents: financialSnapshot.monthlyBurnCents, notes: financialSnapshot.notes })
  .from(financialSnapshot)
  .where(eq(financialSnapshot.userId, userId))
  .limit(1),
```

Destructure the new results from the `Promise.all` and build the life context section:

```typescript
const lifeContextBlock = formatLifeContext(lifeContextRows, financialRows[0] ?? null)
if (lifeContextBlock) {
  lines.unshift("", lifeContextBlock)  // prepend before time/events
}
```

Note: `unshift` with `""` adds a blank line separator. Place the `unshift` call after `lines` is initialized but before any other content is pushed.

**Step 4: Update COACH_SYSTEM_PROMPT in prompts.ts**

Replace the existing prompt with:

```typescript
export const COACH_SYSTEM_PROMPT = `You are Clarity's personal productivity coach.
You have complete visibility into the user's tasks, events, routines, and life context.

When asked "What should I do right now?" or a similar question:
- Read the Life Context section first — it overrides normal task priority
- Pick ONE thing to work on
- State the reason in one sentence
- If Life Context caused you to skip or deprioritize a task, briefly explain why (one sentence)
- Mention the next thing after
- If a routine is scheduled and not done, consider suggesting it
- Never give a list of options — make the decision
- Keep the answer under 120 words
- Be direct and confident`
```

**Step 5: Run tests — expect PASS**

```bash
npx vitest run src/lib/ai/__tests__/coach.test.ts
```

Expected: All 5 tests pass.

**Step 6: Typecheck**

```bash
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/lib/ai/
git commit -m "feat: integrate life context into coach buildContext and system prompt"
```

---

## Task 5: `/life-context` management page

**Files:**
- Create: `src/app/(dashboard)/life-context/page.tsx`
- Create: `src/components/life-context/life-context-list.tsx`
- Create: `src/components/life-context/life-context-form.tsx`
- Create: `src/components/life-context/financial-snapshot-card.tsx`

### `src/app/(dashboard)/life-context/page.tsx` — server component

```typescript
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, desc, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lifeContextItems, financialSnapshot } from "@/lib/schema"
import { LifeContextList } from "@/components/life-context/life-context-list"
import { FinancialSnapshotCard } from "@/components/life-context/financial-snapshot-card"

export default async function LifeContextPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id

  const [items, snapshotRows] = await Promise.all([
    db
      .select()
      .from(lifeContextItems)
      .where(and(eq(lifeContextItems.userId, userId), eq(lifeContextItems.isActive, true)))
      .orderBy(desc(lifeContextItems.urgency), desc(lifeContextItems.createdAt)),
    db
      .select()
      .from(financialSnapshot)
      .where(eq(financialSnapshot.userId, userId))
      .limit(1),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Life Context</h1>
        <p className="text-muted-foreground text-sm">
          What the coach reads before prioritizing your day.
        </p>
      </div>
      <FinancialSnapshotCard snapshot={snapshotRows[0] ?? null} />
      <LifeContextList initialItems={items} />
    </div>
  )
}
```

### `src/components/life-context/financial-snapshot-card.tsx`

A client component with an inline edit form. Fields: bank balance (dollar input, stored as cents), monthly burn (dollar input, stored as cents), notes textarea. Shows computed runway when saved. Calls `PUT /api/life-context/financial`.

Key UI details:
- Dollar inputs (user types `3200`, stored as `320000` cents — multiply by 100 on save, divide by 100 on display)
- Runway displayed as: `~X.X months` in muted text next to the burn field
- "Last updated" timestamp shown below the form
- Save button submits via `fetch`, updates local state on success

### `src/components/life-context/life-context-form.tsx`

A modal (use shadcn `Dialog`) triggered by "Add context" button. Fields: title (text input), description (textarea), urgency toggle (two buttons: Active / Critical — Critical is red). Calls `POST /api/life-context` on submit, closes modal, calls `onCreated(item)` callback to update parent list.

### `src/components/life-context/life-context-list.tsx`

A client component that:
- Renders a list of context item cards (title, description snippet, urgency badge)
- Critical badge: red background. Active badge: amber background.
- Each card has Edit (pencil icon) and Archive (trash icon) buttons
- Edit opens the same Dialog form pre-filled, calls `PATCH /api/life-context/[id]`
- Archive calls `DELETE /api/life-context/[id]`, removes item from local state
- "Add context" button at the top opens the create form

**Step: Typecheck**

```bash
npx tsc --noEmit
```

**Step: Commit**

```bash
git add src/app/(dashboard)/life-context/ src/components/life-context/
git commit -m "feat: add /life-context management page and components"
```

---

## Task 6: Today page — Life Context strip

**Files:**
- Create: `src/components/dashboard/life-context-strip.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

### `src/components/dashboard/life-context-strip.tsx`

A client component (uses `useState` for collapsed state, starts collapsed if no critical items):

```typescript
"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface LifeContextItem {
  id: string
  title: string
  urgency: "active" | "critical"
}

interface FinancialSnap {
  bankBalanceCents: number
  monthlyBurnCents: number
}

interface Props {
  items: LifeContextItem[]
  snapshot: FinancialSnap | null
}

export function LifeContextStrip({ items, snapshot }: Props) {
  const criticalItems = items.filter((i) => i.urgency === "critical")
  const [open, setOpen] = useState(criticalItems.length > 0)

  if (items.length === 0 && !snapshot) return null

  const runway = snapshot && snapshot.monthlyBurnCents > 0
    ? (snapshot.bankBalanceCents / snapshot.monthlyBurnCents).toFixed(1)
    : null

  return (
    <div className="rounded-md border border-border bg-muted/20 text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Life Context</span>
        {criticalItems.length > 0 && (
          <span className="flex items-center gap-1 text-red-600 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {criticalItems.length} critical
          </span>
        )}
        {runway && (
          <span className="ml-auto text-xs text-muted-foreground">Runway: ~{runway} mo</span>
        )}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <span className={cn(
                "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                item.urgency === "critical"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              )}>
                {item.urgency}
              </span>
              <span className="text-sm">{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Modify `src/app/(dashboard)/page.tsx`

Add two more queries to the `Promise.all` in `TodayPage`:

```typescript
// Add to the existing Promise.all:
db
  .select({ id: lifeContextItems.id, title: lifeContextItems.title, urgency: lifeContextItems.urgency })
  .from(lifeContextItems)
  .where(and(eq(lifeContextItems.userId, userId), eq(lifeContextItems.isActive, true)))
  .orderBy(desc(lifeContextItems.urgency)),

db
  .select({ bankBalanceCents: financialSnapshot.bankBalanceCents, monthlyBurnCents: financialSnapshot.monthlyBurnCents })
  .from(financialSnapshot)
  .where(eq(financialSnapshot.userId, userId))
  .limit(1),
```

Render the strip above the events/tasks grid:

```tsx
<LifeContextStrip items={lifeContextRows} snapshot={financialRows[0] ?? null} />
```

**Step: Typecheck**

```bash
npx tsc --noEmit
```

**Step: Commit**

```bash
git add src/components/dashboard/life-context-strip.tsx src/app/(dashboard)/page.tsx
git commit -m "feat: add Life Context strip to Today page"
```

---

## Task 7: Add Life Context to sidebar nav

**Files:**
- Modify: `src/components/sidebar.tsx`

**Step: Add nav item**

In the `NAV_ITEMS` array, add after Routines:

```typescript
import { LayoutDashboard, RotateCcw, Settings, Sparkles, MapPin } from "lucide-react"

// In NAV_ITEMS:
{ href: "/life-context", label: "Life Context", icon: MapPin },
```

`MapPin` (or `Compass`) conveys "where you are in life" without being heavy-handed.

**Step: Typecheck**

```bash
npx tsc --noEmit
```

**Step: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: add Life Context to sidebar navigation"
```

---

## Task 8: Smoke test end-to-end

**Step 1: Start dev server**

```bash
cd ~/clarity && npm run dev
```

**Step 2: Verify these flows manually**

- [ ] `/life-context` loads without error
- [ ] Can add a Critical item — appears with red badge
- [ ] Can add an Active item — appears with amber badge
- [ ] Can edit an item title
- [ ] Can archive an item (disappears from list)
- [ ] Financial snapshot saves and shows runway
- [ ] Today page shows Life Context strip
- [ ] Strip is expanded when Critical items exist
- [ ] Coach includes Life Context in its response (check with "What should I do right now?")
- [ ] Coach explains its reasoning when a task is deprioritized due to Life Context

**Step 3: Final typecheck + lint**

```bash
npx tsc --noEmit && npm run lint
```

**Step 4: Final commit if any cleanup**

```bash
git commit -am "chore: life context smoke test cleanup"
```
