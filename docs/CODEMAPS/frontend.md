# Clarity — Frontend Codemap
_Updated: 2026-03-16_

## Pages (`src/app/(dashboard)/`)

| Page | Component | Notes |
|------|-----------|-------|
| `/` | `page.tsx` | Today dashboard — coach, day plan, events, tasks, widgets |
| `/tasks` | `tasks/page.tsx` | Task hub — table/grid views, create, detail modal |
| `/triage` | `triage/page.tsx` + `triage-content.tsx` | AI triage queue |
| `/email` | `email/page.tsx` | Gmail inbox + starred |
| `/spending` | `spending/page.tsx` | Transactions, accounts |
| `/calendar` | `calendar/page.tsx` | Event list view |
| `/life-context` | `life-context/page.tsx` | Life context manager |
| `/life-context/[id]` | `life-context/[id]/page.tsx` | Item detail |
| `/routines` | `routines/page.tsx` | Routine builder |
| `/chat` | `chat/page.tsx` | AI coach chat |
| `/settings` | `settings/page.tsx` | Integrations, profile |
| `/profile` | `profile/page.tsx` | User profile |

## Component Groups

### Dashboard (`src/components/dashboard/`)
| Component | Purpose |
|-----------|---------|
| `coach-panel.tsx` | AI coach streaming panel |
| `day-plan/index.tsx` | Day plan display |
| `day-plan/horizon-cards.tsx` | Time-based task cards |
| `day-plan/time-card.tsx` | Individual time slot card |
| `event-card.tsx` | Calendar event display |
| `task-card.tsx` | Today page task card |
| `task-list.tsx` | Today page task list |
| `life-context-strip.tsx` | Context summary strip |
| `live-clock.tsx` | Real-time clock |
| `today-mobile-shell.tsx` | Mobile layout wrapper |
| `widgets/` | Finance, weather, streaks, week, triage, runway widgets |
| `widget-sidebar.tsx` | Widget container |

### Tasks (`src/components/tasks/`)
| Component | Purpose |
|-----------|---------|
| `task-table.tsx` | TanStack Table — sorting, bulk select, row click |
| `task-card-enhanced.tsx` | Grid view card |
| `task-detail-modal.tsx` | Dialog (desktop) / Drawer (mobile) — description edit, subtasks, complete/hide |
| `task-group.tsx` | Grouped task display |
| `create-task-modal.tsx` | New task form |
| `tasks-filter-bar.tsx` | Source/priority/project/date filters + search + view toggle |
| `subtask-list.tsx` | Todoist subtask list |
| `source-badge.tsx` | Todoist/Gmail/manual badge |
| `reschedule-popover.tsx` | Date reschedule picker |

### Triage (`src/components/triage/`)
| Component | Purpose |
|-----------|---------|
| `triage-table.tsx` | Triage table (TanStack, status select) |
| `triage-card.tsx` | Card view for triage item |
| `approve-modal.tsx` | Approve → create task modal |
| `subtask-modal.tsx` | Subtask view from triage |
| `score-color.ts` | Score → color utility |

### Email (`src/components/email/`)
| Component | Purpose |
|-----------|---------|
| `email-table.tsx` | Email table view |
| `email-list.tsx` | Email card list |
| `email-card.tsx` | Individual email card |

### Spending (`src/components/spending/`)
| Component | Purpose |
|-----------|---------|
| `transaction-list.tsx` | Transaction list |
| `transaction-row.tsx` | Single transaction |
| `spending-filter-bar.tsx` | Date/category filters |
| `recurring-tab.tsx` | Recurring transactions |
| `account-sidebar.tsx` | Bank account list |

### Life Context (`src/components/life-context/`)
| Component | Purpose |
|-----------|---------|
| `life-context-list.tsx` | Context item list |
| `context-detail-client.tsx` | Item detail view |
| `context-graph.tsx` | Network graph |
| `life-context-form.tsx` | Create/edit form |
| `pin-search-dialog.tsx` | Search to pin items |
| `update-timeline-entry.tsx` | Timeline entry display |
| `financial-snapshot-card.tsx` | Financial summary |

### Settings (`src/components/settings/`)
| Component | Purpose |
|-----------|---------|
| `ai-providers-panel.tsx` | AI key management |
| `ai-connect-form.tsx` | AI provider form |
| `plaid-connection-panel.tsx` | Bank connection |
| `todoist-connect-form.tsx` | Todoist OAuth |
| `openweathermap-connect-form.tsx` | Weather API key |
| `sync-button.tsx` | Manual sync trigger |

### Prompt-Kit (`src/components/prompt-kit/`)
AI chat UI primitives: `chat-container`, `message`, `markdown`, `prompt-input`, `prompt-suggestion`, `loader`

### UI (`src/components/ui/`)
shadcn/ui components: `badge`, `button`, `card`, `checkbox`, `dialog`, `drawer`, `dropdown-menu`, `filter-bar`, `input`, `select`, `table`, `tabs`, `tooltip`, `rich-editor`, `sortable-header`, `view-toggle`, etc.

## Types (`src/types/`)

| File | Key Exports |
|------|-------------|
| `task.ts` | `TaskItem`, `TaskFilters`, `PRIORITY_COLORS`, `PRIORITY_LABELS`, `parseLabels`, `parseMetadata`, `isOverdue` |
| `triage.ts` | `TriageItem`, `cleanTitle`, `parseSourceMetadata` |
| `transaction.ts` | `Transaction`, `TransactionFilter` |
| `life-context.ts` | `LifeContextItem`, `LifeContextUpdate`, `ContextPin` |

## Hooks & Utilities

| File | Purpose |
|------|---------|
| `lib/use-mobile.ts` | `useIsMobile()` — responsive breakpoint |
| `lib/use-active-section.ts` | IntersectionObserver (rooted on `[data-scroll]`) |
| `lib/use-safari-toolbar.ts` | Safari mobile toolbar height |
| `lib/client-sync-events.ts` | `CLARITY_SYNC_COMPLETED_EVENT` custom event |
| `lib/utils.ts` | `cn()` + misc |

## Navigation

Add pages in TWO places:
1. `src/lib/nav-items.ts` — sidebar items
2. `src/components/mobile-nav.tsx` — `PRIMARY_HREFS` or `MORE_HREFS`
