CREATE TABLE IF NOT EXISTS `triage_queue` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `source` text NOT NULL,
  `source_id` text NOT NULL,
  `title` text NOT NULL,
  `snippet` text NOT NULL DEFAULT '',
  `ai_score` integer NOT NULL DEFAULT 0,
  `ai_reasoning` text NOT NULL DEFAULT '',
  `status` text NOT NULL DEFAULT 'pending',
  `todoist_task_id` text,
  `source_metadata` text NOT NULL DEFAULT '{}',
  `created_at` integer NOT NULL DEFAULT (unixepoch()),
  `reviewed_at` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `triage_user_source_idx`
  ON `triage_queue` (`user_id`, `source`, `source_id`);

CREATE INDEX IF NOT EXISTS `triage_user_status_idx`
  ON `triage_queue` (`user_id`, `status`);
