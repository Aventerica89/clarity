import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

// ─── Better Auth core tables ──────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
})

// ─── App tables ───────────────────────────────────────────────────────────────

// Unified tasks — from Todoist, Apple Reminders, Gmail, manual, or routines
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  source: text("source").notNull(),           // todoist | apple_reminders | manual | gmail | routine
  sourceId: text("source_id"),               // external ID for dedup
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),                  // ISO date YYYY-MM-DD
  dueTime: text("due_time"),                  // HH:MM:SS
  priorityScore: integer("priority_score"),   // AI computed 0-100
  priorityManual: integer("priority_manual"), // user override 1-5
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  labels: text("labels").notNull().default("[]"),     // JSON string[]
  metadata: text("metadata").notNull().default("{}"), // JSON object
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex("tasks_user_source_idx").on(t.userId, t.source, t.sourceId),
])

// Unified events — from Google Calendar or Apple Calendar
export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  source: text("source").notNull(),           // google_calendar | apple_calendar
  sourceId: text("source_id"),
  title: text("title").notNull(),
  startAt: integer("start_at", { mode: "timestamp" }).notNull(),
  endAt: integer("end_at", { mode: "timestamp" }).notNull(),
  isAllDay: integer("is_all_day", { mode: "boolean" }).notNull().default(false),
  calendarName: text("calendar_name"),
  location: text("location"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex("events_user_source_idx").on(t.userId, t.source, t.sourceId),
])

// Routines — recurring habits tracked by the streak engine
export const routines = sqliteTable("routines", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  frequency: text("frequency").notNull(), // daily | weekdays | weekends | weekly | custom
  customDays: text("custom_days"),        // JSON number[] — 0=Sun..6=Sat
  preferredTime: text("preferred_time"),  // HH:MM:SS
  durationMinutes: integer("duration_minutes").notNull().default(30),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  streakCurrent: integer("streak_current").notNull().default(0),
  streakBest: integer("streak_best").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

// Routine completions — one row per day a routine was completed
export const routineCompletions = sqliteTable("routine_completions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  routineId: text("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  completedDate: text("completed_date").notNull(), // ISO date YYYY-MM-DD
  completedAt: integer("completed_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex("routine_completions_unique_idx").on(t.routineId, t.completedDate),
])

// Integrations — encrypted OAuth tokens for each connected provider
export const integrations = sqliteTable("integrations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),          // google | todoist | apple_companion
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
  providerAccountId: text("provider_account_id"),
  config: text("config").notNull().default("{}"), // JSON object
  syncStatus: text("sync_status").notNull().default("idle"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  lastError: text("last_error"),
}, (t) => [
  uniqueIndex("integrations_user_provider_idx").on(t.userId, t.provider),
])

// Life Context — free-text situation cards
export const lifeContextItems = sqliteTable("life_context_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  urgency: text("urgency", { enum: ["monitoring", "active", "escalated", "critical", "resolved"] }).notNull().default("active"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

// Life context updates — timestamped progress entries per context item
export const lifeContextUpdates = sqliteTable("life_context_updates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  contextItemId: text("context_item_id").notNull().references(() => lifeContextItems.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  severity: text("severity", { enum: ["monitoring", "active", "escalated", "critical", "resolved"] }).notNull().default("active"),
  source: text("source").notNull().default("user"), // user | ai
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

// User profile — biographical background for AI personalization
export const userProfile = sqliteTable("user_profile", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  occupation: text("occupation"),
  employer: text("employer"),
  city: text("city"),
  householdType: text("household_type"),  // solo | partner | family | roommates
  workSchedule: text("work_schedule"),    // 9-5 | shift | flexible | remote | self-employed
  lifePhase: text("life_phase"),          // free text: "building a SaaS while working full-time"
  healthContext: text("health_context"),
  sideProjects: text("side_projects"),
  lifeValues: text("life_values"),
  notes: text("notes"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

// Routine costs — itemized recurring expenses (rent, insurance, meds, subscriptions)
export const routineCosts = sqliteTable("routine_costs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  category: text("category").notNull().default("other"), // housing | insurance | medical | transport | subscription | utilities | other
  amountCents: integer("amount_cents").notNull(),
  frequency: text("frequency").notNull().default("monthly"), // monthly | weekly | biweekly | annual
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

// Financial snapshot — one row per user, updated manually
export const financialSnapshot = sqliteTable("financial_snapshot", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  bankBalanceCents: integer("bank_balance_cents").notNull().default(0),
  monthlyBurnCents: integer("monthly_burn_cents").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

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

// Coach messages — persistent multi-turn chat history per user/session
export const coachMessages = sqliteTable("coach_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
})

// Chat sessions — named conversation threads on the /chat page
export const chatSessions = sqliteTable("chat_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New conversation"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
})

// Plaid Accounts — one row per account within an Item
export const plaidAccounts = sqliteTable("plaid_accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id").notNull().references(() => plaidItems.id, { onDelete: "cascade" }),
  plaidAccountId: text("plaid_account_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subtype: text("subtype"),
  currentBalanceCents: integer("current_balance_cents").notNull().default(0),
  availableBalanceCents: integer("available_balance_cents"),
  lastUpdatedAt: integer("last_updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

// Transactions — from Plaid sync, CSV imports, or n8n
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id").references(() => plaidItems.id, { onDelete: "set null" }),
  accountId: text("account_id"),                    // plaid_account_id or free-text for CSV
  plaidTransactionId: text("plaid_transaction_id"), // Plaid's unique ID, null for CSV
  date: text("date").notNull(),                     // YYYY-MM-DD
  amountCents: integer("amount_cents").notNull(),   // positive = outflow, negative = inflow
  name: text("name").notNull(),                     // raw transaction name from bank
  merchantName: text("merchant_name"),              // cleaned merchant name (Plaid or manual)
  category: text("category"),                       // primary category (Plaid or AI-assigned)
  subcategory: text("subcategory"),                 // detailed category
  pending: integer("pending", { mode: "boolean" }).notNull().default(false),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  accountLabel: text("account_label"),               // "personal" | "business" | custom label
  source: text("source").notNull().default("plaid"), // plaid | csv-import | n8n
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex("transactions_plaid_id_idx").on(t.plaidTransactionId),
])

// Emails — cached Gmail messages, synced via cron or manual refresh
export const emails = sqliteTable("emails", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  gmailId: text("gmail_id").notNull(),
  threadId: text("thread_id").notNull(),
  subject: text("subject").notNull(),
  fromRaw: text("from_raw").notNull(),
  snippet: text("snippet").notNull().default(""),
  date: text("date").notNull(),
  isStarred: integer("is_starred", { mode: "boolean" }).notNull().default(false),
  isFavorited: integer("is_favorited", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex("emails_user_gmail_idx").on(t.userId, t.gmailId),
])

// Triage queue — AI-scored items from all sources, pending user review
export const triageQueue = sqliteTable("triage_queue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // gmail | google_calendar | todoist | apple_reminders | apple_notes | apple_mail | apple_calendar
  sourceId: text("source_id").notNull(),
  title: text("title").notNull(),
  snippet: text("snippet").notNull().default(""),
  aiScore: integer("ai_score").notNull().default(0),
  aiReasoning: text("ai_reasoning").notNull().default(""),
  status: text("status", { enum: ["pending", "approved", "dismissed", "pushed_to_context"] })
    .notNull()
    .default("pending"),
  todoistTaskId: text("todoist_task_id"),
  sourceMetadata: text("source_metadata").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
}, (t) => [
  uniqueIndex("triage_user_source_idx").on(t.userId, t.source, t.sourceId),
])

// Day plans — AI-generated daily plan + 3-day horizon, cached per user per day
export const dayPlans = sqliteTable("day_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  planDate: text("plan_date").notNull(),
  todayPlan: text("today_plan").notNull(),
  horizon: text("horizon").notNull(),
  model: text("model").notNull().default("haiku"),
  generatedAt: integer("generated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  contextSnapshot: text("context_snapshot"),
}, (t) => [
  uniqueIndex("dp_user_date_idx").on(t.userId, t.planDate),
])
