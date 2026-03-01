# Todoist Triage Flow Design

Date: 2026-02-28

## Problem

294 Todoist tasks are synced to the `tasks` table but invisible in the UI:
- All have `triaged=false` (default)
- Active tasks query requires `triaged=true`
- Triage sync scoring threshold (60) filters out 97% of Todoist tasks
- Only overdue/urgent tasks score high enough to enter triage_queue

## Decision

All Todoist tasks flow through Triage. User approves (moves to Tasks) or dismisses (hides). During triage, user can re-prioritize tasks with inline badges that write back to Todoist API.

## Changes

### 1. Remove score threshold for Todoist tasks
**File:** `src/lib/triage/sync.ts`
- Remove `if (score.score < SCORE_THRESHOLD) { skipped++; continue }` for Todoist tasks
- Score is still calculated and displayed but not used as a gate
- Other sources (Gmail, Calendar, Google Tasks) keep the threshold at 60

### 2. Fix dismiss to hide Todoist tasks
**File:** `src/app/api/triage/[id]/route.ts`
- In the `dismiss` action, if `item.source === "todoist"`, also set `isHidden=true` on the matching `tasks` row
- Prevents dismissed tasks from being orphaned (triaged=false, isHidden=false, invisible everywhere)

### 3. Inline priority badges on Todoist triage cards
**File:** `src/components/triage/triage-card.tsx`
- Add clickable priority badges below the title for Todoist items only
- Todoist priorities: p1 (normal/gray), p2 (medium/blue), p3 (high/orange), p4 (urgent/red)
- Clicking a badge sets local state; change is applied on approve
- Non-Todoist triage items are unaffected

### 4. Priority write-back on approve
**File:** `src/app/api/triage/[id]/route.ts`
- Accept optional `priority` field in the approve action body
- If priority is provided and differs from current, call Todoist REST API: `POST /rest/v2/tasks/{id}` with `{ priority }`
- Also update `priorityManual` on the local `tasks` row to keep DB in sync

### 5. Backfill existing tasks into triage queue
**Method:** One-time SQL via Turso HTTP API
- INSERT INTO triage_queue SELECT from tasks WHERE source='todoist' AND triaged=false
- Skip any that already exist (ON CONFLICT DO NOTHING)
- Score each task using the `scoreTodoistTask` function for display purposes

## Data Flow

```
Todoist API -> syncTodoistTasks() -> tasks table (triaged=false)
                                         |
syncTriageQueue() -> triage_queue (ALL Todoist, no threshold)
                                         |
                    User approves -> tasks.triaged=true, delete triage row
                    User dismisses -> tasks.isHidden=true, triage status=dismissed
                    User re-prioritizes -> Todoist API update + tasks.priorityManual
```

## DB State Summary (pre-fix)

| source | triaged | count |
|--------|---------|-------|
| manual | true | 2 |
| manual (completed) | true | 1 |
| todoist | false | 294 |

Triage queue: 3 pending todoist, 5 dismissed, 1 pushed_to_context

## Files to Modify

1. `src/lib/triage/sync.ts` — remove threshold for todoist
2. `src/app/api/triage/[id]/route.ts` — dismiss hides tasks, approve accepts priority
3. `src/components/triage/triage-card.tsx` — inline priority badges
4. Turso HTTP API — one-time backfill query
