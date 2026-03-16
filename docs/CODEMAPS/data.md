# Clarity — Data Codemap
_Updated: 2026-03-16_

## Database

- **Engine**: Turso (LibSQL) — SQLite-compatible, edge-deployed
- **ORM**: Drizzle ORM (`dialect: turso`)
- **Schema**: `src/lib/schema.ts` (23 tables)
- **Migrations**: `supabase/migrations/` (Drizzle-generated SQL — named "supabase" for historical reasons, do not rename)
- **Config**: `drizzle.config.ts`

## Tables

### Auth (Better Auth managed)
| Table | Key Columns |
|-------|-------------|
| `user` | `id`, `name`, `email`, `image`, `createdAt` |
| `session` | `id`, `userId`, `token`, `expiresAt` |
| `account` | `id`, `userId`, `providerId`, `accessToken`, `refreshToken` |
| `verification` | `id`, `identifier`, `value`, `expiresAt` |

### Tasks
| Table | Key Columns |
|-------|-------------|
| `tasks` | `id`, `userId`, `title`, `description`, `source` (todoist/gmail/manual), `sourceId`, `status` (active/completed/hidden), `priorityManual`, `dueDate`, `dueTime`, `labels`, `metadata` (JSON), `isCompleted`, `createdAt` |

### Events
| Table | Key Columns |
|-------|-------------|
| `events` | `id`, `userId`, `title`, `start`, `end`, `allDay`, `location`, `source`, `sourceId` |

### Routines
| Table | Key Columns |
|-------|-------------|
| `routines` | `id`, `userId`, `title`, `frequency`, `targetTime`, `isActive` |
| `routine_completions` | `id`, `routineId`, `userId`, `completedAt` |
| `routine_costs` | `id`, `userId`, `routineId`, `estimatedMinutes`, `costPerHour` |

### Integrations
| Table | Key Columns |
|-------|-------------|
| `integrations` | `id`, `userId`, `provider` (anthropic/deepseek/groq/gemini/gemini-pro/openweathermap/todoist), `encryptedToken`, `metadata`, `createdAt` |

### Life Context
| Table | Key Columns |
|-------|-------------|
| `life_context_items` | `id`, `userId`, `title`, `category`, `severity`, `content` (rich text), `tags`, `createdAt` |
| `life_context_updates` | `id`, `itemId`, `userId`, `content`, `createdAt` |
| `context_pins` | `id`, `userId`, `contextItemId`, `pinnedType` (task/email/event), `pinnedId`, `note` |

### Finance
| Table | Key Columns |
|-------|-------------|
| `financial_snapshot` | `id`, `userId`, `balance`, `monthlyBurn`, `runway`, `updatedAt` |
| `plaid_items` | `id`, `userId`, `accessToken` (encrypted), `institutionName`, `institutionId`, `status` |
| `plaid_accounts` | `id`, `plaidItemId`, `userId`, `accountId`, `name`, `type`, `subtype`, `mask` |
| `transactions` | `id`, `userId`, `plaidAccountId`, `transactionId`, `name`, `amount`, `date`, `category`, `isRecurring`, `merchantName` |

### AI/Chat
| Table | Key Columns |
|-------|-------------|
| `coach_messages` | `id`, `userId`, `sessionId`, `role`, `content`, `createdAt` — pruned >90d |
| `chat_sessions` | `id`, `userId`, `title`, `createdAt`, `updatedAt` |
| `day_plans` | `id`, `userId`, `date`, `plan` (JSON), `generatedAt` |

### Email & Triage
| Table | Key Columns |
|-------|-------------|
| `emails` | `id`, `userId`, `gmailId`, `threadId`, `subject`, `sender`, `senderName`, `snippet`, `body`, `isRead`, `isStarred`, `receivedAt` — pruned >60d |
| `triage_queue` | `id`, `userId`, `sourceType` (email/task), `sourceId`, `title`, `score`, `reasoning`, `status` (pending/approved/dismissed), `resolvedAt` — pruned resolved >30d |

### User
| Table | Key Columns |
|-------|-------------|
| `user_profile` | `id`, `userId`, `bio`, `timezone`, `preferences` (JSON) |

## Key Query Patterns

```typescript
// Always filter by userId — no RLS
await db.select().from(tasks).where(eq(tasks.userId, session.user.id))

// Validate inputs with Zod before DB writes
const parsed = schema.safeParse(await request.json())
if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

// Encrypted provider tokens
const { encryptedToken } = await db.select()...
const token = decrypt(encryptedToken, TOKEN_ENCRYPTION_KEY)
```

## Schema Changes

```bash
# Generate migration from schema diff
npx drizzle-kit generate

# Push directly (dev only)
npx drizzle-kit push

# If drizzle-kit push has conflicts → use Turso HTTP API for targeted DDL
# See: docs/CODEMAPS/architecture.md gotchas
```
