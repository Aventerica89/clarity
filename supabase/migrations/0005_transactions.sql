CREATE TABLE IF NOT EXISTS `transactions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `plaid_item_id` text REFERENCES `plaid_items`(`id`) ON DELETE SET NULL,
  `account_id` text,
  `plaid_transaction_id` text,
  `date` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `name` text NOT NULL,
  `merchant_name` text,
  `category` text,
  `subcategory` text,
  `pending` integer NOT NULL DEFAULT 0,
  `source` text NOT NULL DEFAULT 'plaid',
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `updated_at` integer NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS `transactions_plaid_id_idx` ON `transactions` (`plaid_transaction_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `transactions_dedup_idx` ON `transactions` (`user_id`, `date`, `amount_cents`, `name`);
