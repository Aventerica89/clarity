# Design: Life Triage & Life OS

> **Date:** 2026-02-23
> **Status:** Approved — ready for implementation planning

---

## Overview

Transform Clarity from a unified task/event viewer into an intelligent life OS. Two
layers: a **Triage System** (reactive — all sources feed a queue you process on your
terms) and a **Life OS** (proactive — Claude knows your full picture and surfaces what
matters before you think to ask).

**Core flows:**
- All sources (Gmail, Calendar, Todoist, Apple) → AI-scored triage queue → approve /
  dismiss / push to context
- Approved triage items → Todoist task + AI-generated subtasks in one flow
- Life Context evolves into a rich personal profile with horizon items, goals, values,
  identity
- Coach reads all of it and proactively nudges when capacity exists or deadlines approach
- Chat gets suggestion chips for one-tap access to flagged items

---

## Section 1: Data Architecture

### New table: `triage_queue`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | UUID |
| `user_id` | text FK | references user |
| `source` | text | gmail \| google_calendar \| todoist \| apple_reminders \| apple_notes \| apple_mail \| apple_calendar |
| `source_id` | text | external ID for dedup |
| `title` | text | display title |
| `snippet` | text | truncated preview (max 300 chars) |
| `ai_score` | integer | 0–100 urgency score |
| `ai_reasoning` | text | one-sentence explanation |
| `status` | text | pending \| approved \| dismissed \| pushed_to_context |
| `todoist_task_id` | text | set when approved + pushed to Todoist |
| `source_metadata` | text | JSON — email thread ID, event ID, etc. |
| `created_at` | timestamp | |
| `reviewed_at` | timestamp | when status changed from pending |

Unique index: `(user_id, source, source_id)`

### New table: `horizon_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | UUID |
| `user_id` | text FK | references user |
| `title` | text | "RN license renewal" |
| `notes` | text | optional detail |
| `category` | text | license \| deadline \| goal_long \| goal_short \| seasonal \| financial |
| `due_date` | text | ISO date, nullable |
| `status` | text | active \| snoozed \| completed |
| `snoozed_until` | text | ISO date, nullable |
| `last_nudged_at` | timestamp | prevents repeat nudges back-to-back |
| `todoist_task_id` | text | linked Todoist task if created |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### Extended `user_profile` (new columns)

```
personality_type     text   -- MBTI / Enneagram / freeform
personality_notes    text   -- how I work best, communication style
core_values          text   -- JSON string[]
work_style           text   -- freeform
goals_short_term     text   -- this month / this quarter
goals_long_term      text   -- this year / someday
```

### Unchanged

`life_context_items` — curated situational cards, user-controlled. Not modified.

---

## Section 2: Triage System

### Sources & sync

All sources feed the same `triage_queue` table. Sync triggers:
- **Cron** — existing Vercel cron (daily on Hobby, every 5min on Pro)
- **Manual** — "Scan now" button calls the same endpoint on demand

**Scoring pipeline (split by source type):**

| Source type | Scoring method | Reasoning |
|-------------|---------------|-----------|
| Todoist | Deterministic from due date + priority | "P1 task, overdue 2 days" |
| Google Calendar | Deterministic from start time | "Meeting in 3 hours" |
| Apple Reminders | Deterministic from reminder date | "Due today" |
| Apple Calendar | Deterministic from start time | "Event tomorrow morning" |
| Gmail | Claude Haiku infers from subject + snippet | "Sender requests response by Friday" |
| Apple Notes | Claude Haiku infers from content | "Mentions license renewal and expiration" |
| Apple Mail | Claude Haiku infers from subject + sender | "Flagged by sender, urgent language" |

Dedup: `(user_id, source, source_id)` unique index. Re-scanning never creates duplicate rows.

Badge threshold: score ≥ 60 counts toward nav badge.

### Gmail OAuth

Add `gmail.readonly` scope to existing Google OAuth consent. Same Google token, same
Better Auth `account` table row — just additional scope on re-consent. No new OAuth
provider needed.

If user wants to mark emails read or archive from Clarity: add `gmail.modify` scope
(optional, Phase 1 extension).

### Triage review UX

Card queue on `/triage` (or modal sheet). Each card shows:
- Source icon + title + snippet
- Score badge + one-line AI reasoning
- Three actions: **Approve → Todoist** | **Push to Context** | **Dismiss**

Items with no due date show a date picker in the approve flow.

### Approve → Todoist flow

1. Confirm or edit task title
2. Pick Todoist project (fetched from Todoist API)
3. Optionally set due date
4. Claude suggests 2–5 subtasks — user edits/removes
5. Confirm → task + subtasks created via Todoist API
6. `todoist_task_id` saved, row marked `approved`

### Push to Context

Promotes item to `life_context_items` as a curated card. No Todoist task created.
Row marked `pushed_to_context`.

### Background signals (not stored)

Last 100 Gmail messages (subject + snippet only, never full body) summarized by Haiku
and injected into coach context window as lower-trust background signals. Fetched fresh
on each coach session open. Never written to the database.

---

## Section 3: Life Context & Life OS

### Page structure

`/life-context` gets a secondary left rail — narrow section nav between the main sidebar
and content area. On mobile: horizontal tab strip at top.

**Sections:**
| Section | Contents |
|---------|---------|
| Context | Current situational cards (existing, unchanged) |
| Identity | Occupation, life phase, household, work schedule |
| Personality | Type, work style, communication style |
| Values | Core values (ranked or described) |
| Goals | Short-term (month/quarter) + long-term (year/someday) |
| Horizon | Named items with due dates, categories, snooze |
| Health | Health context, relevant patterns (user-written only) |

Each section is a focused form — intentionally short. Coach knows which sections are
filled and can prompt you to complete ones that improve its accuracy.

### Horizon items UX

Listed under the Horizon section. Each item:
- Title + notes
- Category tag
- Optional due date (user-set)
- Snooze until date
- Link to Todoist task (if created)
- Mark complete

### Coach system prompt structure

```
VERIFIED CONTEXT
→ Life context cards (situational, curated)
→ Horizon items (active, non-snoozed)
→ Profile: identity, values, goals, personality

BACKGROUND SIGNALS (lower trust, not stored)
→ Last 100 email summaries (fresh fetch)
→ Recent calendar context

TODAY
→ Tasks (unified tasks table)
→ Events (unified events table)
```

Ordering matters — verified context read first, background is color, today is operational.
Structure provides weighting without explicit instructions to the model.

---

## Section 4: Proactive Coach & Chat UX

### Dashboard — "On Your Radar" card

Positioned below today's priority tasks. Shows 2–4 horizon items sorted by:
1. Due date proximity
2. Category weight (license > financial > deadline > goal_long > goal_short > seasonal)

Each row: title, category tag, days-until (or "no date"), quick-action button.
Card disappears if all items are snoozed or completed. Never noisy.

### Chat — suggestion chips

Horizontal strip above the chat input. Generated fresh on each chat session open.

Sources:
- Active horizon items near due date
- Triage items awaiting review ("3 items need your review")
- Capacity-aware ("Top priorities cleared — something from your radar?")
- Profile gaps ("Your Goals section is empty — want to fill it in?")

Rules:
- Maximum 4 chips at once
- 4–6 words each
- Hidden if nothing relevant
- Tapping pre-fills input or opens quick-action sheet
- Existing chat bar layout unchanged

### Proactive nudging

When the coach detects capacity (top tasks cleared), it surfaces a horizon item naturally
in conversation — not robotically. `last_nudged_at` prevents repeating the same item
in back-to-back sessions. Snooze lets the user defer until a specific date.

### Triage → Todoist subtask generation

Claude generates subtasks before creating anything. User sees them, edits or removes,
then confirms. 4-tap flow from flagged item to structured Todoist task with a plan.

---

## Section 5: Build Phases

### Phase 1 — Gmail Triage (start here)
- Add `gmail.readonly` to Google OAuth scope
- `triage_queue` table + migration
- Gmail sync adapter (Haiku scores unstructured)
- Todoist + Calendar adapters (deterministic scoring, no AI)
- Triage page: card queue, approve/dismiss/push-to-context
- Approve → Todoist: project picker, Haiku-generated subtasks, create
- Nav badge (pending count)
- Manual "Scan now" button

### Phase 2 — Apple sources into triage
- Companion sends Apple Reminders, Notes, Mail, Calendar → triage queue
- Same pipeline, source-appropriate scoring
- All source icons in triage UI

### Phase 3 — Life OS: Profile + Horizon
- Secondary left rail on Life Context page
- All profile section forms
- `horizon_items` table + migration
- Horizon section UI (add, snooze, link Todoist, complete)
- "On Your Radar" dashboard card

### Phase 4 — Coach integration
- Background email summaries in coach context window
- Horizon items + full profile in coach system prompt
- `last_nudged_at` nudge logic
- Chat suggestion chips

### Phase 5 — Reminders write-back (future)
- "Plan my day" → companion creates timed Apple Reminders
- iCloud syncs to iPhone → native phone pings
- Interval scheduling from coach output

---

## Future notes

- Apple Notes write-back (companion already supports it)
- "Plan my day" → timed Apple Reminders → iPhone pings at each block (Phase 5)
- Gmail `modify` scope for mark-read / archive from triage
- Vercel Pro upgrade unlocks 5-min cron for near-real-time triage
