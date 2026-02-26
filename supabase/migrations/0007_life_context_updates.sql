-- Life context updates: timestamped progress entries per context item
CREATE TABLE IF NOT EXISTS life_context_updates (
  id TEXT PRIMARY KEY,
  context_item_id TEXT NOT NULL REFERENCES life_context_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS lcu_context_item_idx ON life_context_updates(context_item_id, created_at);

-- Expand urgency column to support new severity levels (monitoring, escalated, resolved)
-- SQLite doesn't enforce enum constraints, so existing active/critical values still work
