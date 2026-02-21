CREATE TABLE IF NOT EXISTS `plaid_items` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `plaid_item_id` text NOT NULL UNIQUE,
  `institution_id` text NOT NULL,
  `institution_name` text NOT NULL,
  `access_token_encrypted` text NOT NULL,
  `sync_status` text NOT NULL DEFAULT 'idle',
  `last_synced_at` integer,
  `last_error` text,
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS `plaid_accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `plaid_item_id` text NOT NULL REFERENCES `plaid_items`(`id`) ON DELETE CASCADE,
  `plaid_account_id` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `subtype` text,
  `current_balance_cents` integer NOT NULL DEFAULT 0,
  `available_balance_cents` integer,
  `last_updated_at` integer NOT NULL DEFAULT (unixepoch())
);
