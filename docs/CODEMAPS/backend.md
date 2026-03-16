# Clarity — Backend Codemap
_Updated: 2026-03-16_

## API Routes (`src/app/api/`)

### Auth
| Route | Method | Purpose |
|-------|--------|---------|
| `auth/[...all]` | * | Better Auth handler |
| `auth/todoist/route` | GET | Todoist OAuth initiate |
| `auth/todoist/callback` | GET | Todoist OAuth callback |

### Tasks
| Route | Method | Purpose |
|-------|--------|---------|
| `tasks` | GET/POST | List (filtered) / create |
| `tasks/bulk` | POST | Bulk complete/hide (max 50) |
| `tasks/[id]` | PATCH | Update description |
| `tasks/[id]/complete` | POST | Mark complete |
| `tasks/[id]/hide` | POST | Hide task |
| `tasks/[id]/priority` | POST | Update priority |
| `tasks/[id]/reschedule` | POST | Update due date |
| `tasks/[id]/subtasks` | GET | Fetch Todoist subtasks |

### Triage
| Route | Method | Purpose |
|-------|--------|---------|
| `triage` | GET | List scored items |
| `triage/count` | GET | Badge count |
| `triage/scan` | POST | Trigger AI scoring |
| `triage/[id]` | PATCH/DELETE | Update/dismiss |
| `triage/[id]/approve` | POST | Approve → create task |

### AI
| Route | Method | Purpose |
|-------|--------|---------|
| `ai/coach` | POST | Streaming coach response |
| `ai/day-plan` | POST | Generate day plan |

### Sync
| Route | Method | Purpose |
|-------|--------|---------|
| `sync/gmail` | POST | Gmail cache refresh |
| `sync/google-calendar` | POST | Calendar refresh |
| `sync/todoist` | POST | Todoist task refresh |
| `cron/sync` | GET | All sync orchestrator |
| `cron/prune` | GET | Data rotation (90d coach, 30d triage, 60d email) |

### Emails
| Route | Method | Purpose |
|-------|--------|---------|
| `emails` | GET | Inbox list |
| `emails/starred` | GET | Starred list |
| `emails/[gmailId]/body` | GET | Fetch body |
| `emails/actions` | POST | Mark read/archive/star |
| `emails/archive` | POST | Archive email |
| `emails/favorite` | POST | Star email |

### Finance
| Route | Method | Purpose |
|-------|--------|---------|
| `plaid/create-link-token` | POST | Plaid Link init |
| `plaid/exchange-token` | POST | Exchange public token |
| `plaid/sync` | POST | Sync transactions |
| `plaid/items` | GET | List connections |
| `plaid/items/[itemId]` | DELETE | Disconnect bank |
| `plaid/oauth-callback` | GET | Plaid OAuth return |
| `transactions` | GET | Query transactions |
| `transactions/[id]/recurring` | POST | Mark recurring |
| `spending/accounts` | GET | Account balances |
| `widgets/finance` | GET | Finance widget data |
| `webhooks/plaid` | POST | Plaid webhook handler |

### Life Context
| Route | Method | Purpose |
|-------|--------|---------|
| `life-context` | GET/POST | List/create items |
| `life-context/search` | GET | Search items |
| `life-context/graph` | GET | Graph data |
| `life-context/financial` | GET | Financial snapshot |
| `life-context/[id]` | GET/PATCH/DELETE | CRUD item |
| `life-context/[id]/updates` | GET/POST | Timeline entries |
| `life-context/[id]/pins` | GET/POST | Context pins |
| `life-context/[id]/pins/search` | GET | Search pinnable items |
| `life-context/[id]/pins/[pinId]` | DELETE | Remove pin |

### Other
| Route | Method | Purpose |
|-------|--------|---------|
| `profile` | GET/PATCH | User profile |
| `routine-costs` | GET/POST | Routine time estimates |
| `routine-costs/[id]` | PATCH/DELETE | Update/delete |
| `chat/sessions` | GET/POST | Chat sessions |
| `chat/sessions/[id]` | GET/PATCH/DELETE | Session CRUD |
| `integrations/*` | GET/POST | AI provider key management |
| `todoist/projects` | GET | Todoist project list |
| `widgets/weather` | GET | Weather widget |
| `widgets/streaks` | GET | Routine streaks |
| `widgets/week` | GET | Week summary |
| `webhooks/todoist` | POST | Todoist webhook |

## Core Libraries (`src/lib/`)

| File | Purpose |
|------|---------|
| `db.ts` | Turso/LibSQL + Drizzle client |
| `schema.ts` | 23-table Drizzle schema |
| `auth.ts` | Better Auth config |
| `crypto.ts` | Token encryption/decryption |
| `proxy.ts` | Rate-limiting middleware |
| `ratelimit.ts` | Upstash Redis limiter |
| `pins.ts` | Polymorphic context pin logic |
| `sanitize-html.ts` | HTML sanitization |
| `nav-items.ts` | Navigation registry |

## AI (`src/lib/ai/`)

| File | Purpose |
|------|---------|
| `client.ts` | Multi-provider factory (Anthropic→DeepSeek→Groq→Gemini) |
| `coach.ts` | Streaming coach logic |
| `prompts.ts` | System prompts |
| `plan-parser.ts` | Day plan parsing |
| `todoist-tools.ts` | Todoist AI tool definitions |

## Integrations (`src/lib/integrations/`)

| File | Purpose |
|------|---------|
| `gmail.ts` | Gmail API client |
| `gmail-sync.ts` | Gmail cache sync logic |
| `google-calendar.ts` | Calendar sync |
| `google-tasks.ts` | Google Tasks (unused/deferred) |
| `todoist.ts` | Todoist API client |
| `contacts.ts` | Google Contacts |

## Sync & Triage (`src/lib/sync/`, `src/lib/triage/`)

| File | Purpose |
|------|---------|
| `sync/orchestrator.ts` | Coordinates all sync sources |
| `triage/score-structured.ts` | AI triage scoring logic |
| `triage/sync.ts` | Triage queue population |
| `tasks/cleanup.ts` | `purgeOldCompletedTasks` |
| `plaid/sync.ts` | Plaid transaction sync |
