-- Day plans: AI-generated daily plan + 3-day horizon, cached per user per day
CREATE TABLE IF NOT EXISTS day_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  plan_date TEXT NOT NULL,
  today_plan TEXT NOT NULL,
  horizon TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'haiku',
  generated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  context_snapshot TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS dp_user_date_idx ON day_plans(user_id, plan_date);

-- Add source column to life_context_updates for AI addendum support
ALTER TABLE life_context_updates ADD COLUMN source TEXT NOT NULL DEFAULT 'user';
