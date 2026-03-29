CREATE TABLE `companion_sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`sync_date` text NOT NULL,
	`schedule_hash` text NOT NULL,
	`apple_reminder_ids` text DEFAULT '[]' NOT NULL,
	`synced_at` integer DEFAULT (unixepoch()) NOT NULL,
	`status` text DEFAULT 'synced' NOT NULL,
	`last_error` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companion_sync_user_date_idx` ON `companion_sync_state` (`user_id`,`sync_date`);--> statement-breakpoint
CREATE TABLE `day_structure_alarms` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`time` text NOT NULL,
	`alarm_type` text DEFAULT 'alarm' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `day_structure_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ds_alarms_template_idx` ON `day_structure_alarms` (`template_id`);--> statement-breakpoint
CREATE TABLE `day_structure_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`override_date` text NOT NULL,
	`template_id` text,
	`overrides_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `day_structure_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ds_overrides_user_date_idx` ON `day_structure_overrides` (`user_id`,`override_date`);--> statement-breakpoint
CREATE TABLE `day_structure_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`days_of_week` text DEFAULT '[]' NOT NULL,
	`sleep_goal_hours` real DEFAULT 8 NOT NULL,
	`wake_time` text NOT NULL,
	`prep_time_mins` integer DEFAULT 45 NOT NULL,
	`commute_time_mins` integer DEFAULT 0 NOT NULL,
	`work_start_time` text,
	`lunch_time` text,
	`dinner_time` text,
	`wind_down_mins` integer DEFAULT 120 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ds_templates_user_idx` ON `day_structure_templates` (`user_id`);--> statement-breakpoint
CREATE TABLE `routine_checklist_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`completed_date` text NOT NULL,
	`completed_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `routine_checklist_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routine_checklist_completions_unique_idx` ON `routine_checklist_completions` (`item_id`,`completed_date`);--> statement-breakpoint
CREATE INDEX `routine_checklist_completions_user_date_idx` ON `routine_checklist_completions` (`user_id`,`completed_date`);--> statement-breakpoint
CREATE TABLE `routine_checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`checklist_id` text NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`checklist_id`) REFERENCES `routine_checklists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routine_checklist_items_checklist_idx` ON `routine_checklist_items` (`checklist_id`);--> statement-breakpoint
CREATE TABLE `routine_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`trigger_time_ref` text NOT NULL,
	`alarm_enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routine_checklists_user_idx` ON `routine_checklists` (`user_id`);--> statement-breakpoint
ALTER TABLE `life_context_updates` ADD `proposed_urgency` text;--> statement-breakpoint
ALTER TABLE `life_context_updates` ADD `approval_status` text;--> statement-breakpoint
ALTER TABLE `life_context_updates` ADD `model` text;--> statement-breakpoint
CREATE INDEX `life_context_updates_item_idx` ON `life_context_updates` (`context_item_id`);--> statement-breakpoint
CREATE INDEX `life_context_updates_user_idx` ON `life_context_updates` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_sessions_user_idx` ON `chat_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `coach_messages_user_session_idx` ON `coach_messages` (`user_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `events_user_start_idx` ON `events` (`user_id`,`start_at`);--> statement-breakpoint
CREATE INDEX `life_context_items_user_active_idx` ON `life_context_items` (`user_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `plaid_items_user_idx` ON `plaid_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `routine_completions_user_date_idx` ON `routine_completions` (`user_id`,`completed_date`);--> statement-breakpoint
CREATE INDEX `routines_user_active_idx` ON `routines` (`user_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `tasks_user_completed_idx` ON `tasks` (`user_id`,`is_completed`);--> statement-breakpoint
CREATE INDEX `tasks_user_due_idx` ON `tasks` (`user_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `transactions_user_date_idx` ON `transactions` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `triage_user_status_idx` ON `triage_queue` (`user_id`,`status`);