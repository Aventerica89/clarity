-- Add spending-related columns to transactions table
ALTER TABLE transactions ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN account_label TEXT;

-- Index for filtered queries on the spending page
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS transactions_user_recurring_idx ON transactions(user_id, is_recurring);
