# Life Context — Feature Design

**Date:** 2026-02-20
**Status:** Approved

## Problem

Clarity's AI coach has tasks and events but no awareness of what's actually going on in
your life. A messy to-do list is full of noise — bathroom light installs, low-priority
errands — that the coach can't distinguish from urgent real-world blockers. The result:
the coach may suggest irrelevant tasks when you're broke, blocked, or in crisis mode.

## Solution

A "Life Context" layer: free-text situation cards + a financial snapshot that get
prepended to every coach prompt. The coach uses this context to re-rank tasks and
explain its reasoning when Life Context caused a decision.

## Data Model

### `lifeContextItems`

| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | Primary key |
| userId | text | FK → user |
| title | text | Short label, e.g. "Motorcycle must be fixed before I can move" |
| description | text | Free-text detail, a few sentences |
| urgency | enum: critical / active | critical = affects everything now; active = relevant background |
| isActive | boolean | Soft-delete / archive |
| createdAt | datetime | |
| updatedAt | datetime | |

### `financialSnapshot`

| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid) | Primary key |
| userId | text | FK → user, unique (one row per user) |
| bankBalance | integer | In cents to avoid float issues |
| monthlyBurn | integer | In cents |
| notes | text (nullable) | Optional free-text context |
| updatedAt | datetime | User-updated manually |

Runway is computed at query time: `bankBalance / monthlyBurn` in months.

## UI

### `/life-context` page

- Financial snapshot card at the top — always visible, editable inline
  - Fields: bank balance, monthly burn, optional notes
  - Displays computed runway: "~X weeks"
- List of Life Context cards below
  - Critical items shown first (red badge), then Active (amber badge)
  - Each card: title + description snippet + urgency badge + edit/archive buttons
- "Add context" button → modal with title field, description textarea, urgency toggle

### Today page strip

- Small collapsible "Life Context" strip above the task/event grid
- Shows: critical item titles (red badges) + one-line financial summary ("Runway: ~8 wks")
- Collapsed by default after first view — awareness without clutter
- Coach reads Life Context regardless of whether the strip is expanded

## AI Coach Integration

Life Context is prepended to the coach prompt before the task list:

```
[Life Context]
CRITICAL: Motorcycle must be fixed before I can move — estimated 2 full days, waiting on part
ACTIVE: Job hunting — need position with RV hookup and appropriate climate

[Financial Context]
Bank: $3,200 | Burn: ~$1,400/mo | Runway: ~2.3 months

[Today's tasks + events]
...
```

The coach must:
1. Use this context to re-rank or deprioritize tasks accordingly
2. Include a brief explanation when Life Context caused a task to be skipped or deprioritized
   - Example: "Skipping bathroom lights — motorcycle fix is blocking your move and is higher urgency given ~2 month runway."
3. Surface Life Context blockers proactively if they are unaddressed and blocking other tasks

## Out of Scope (This Version)

- Monarch Money API integration (unofficial API, fragile — revisit as Phase 2)
- Linking tasks directly to Life Context items
- Urgency beyond critical/active (no severity scale)
- Notifications or reminders tied to Life Context items
