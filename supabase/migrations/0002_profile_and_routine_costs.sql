CREATE TABLE `user_profile` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL UNIQUE REFERENCES `user`(`id`) ON DELETE CASCADE,
  `occupation` text,
  `employer` text,
  `city` text,
  `household_type` text,
  `work_schedule` text,
  `life_phase` text,
  `health_context` text,
  `side_projects` text,
  `life_values` text,
  `notes` text,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE `routine_costs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `label` text NOT NULL,
  `category` text DEFAULT 'other' NOT NULL,
  `amount_cents` integer NOT NULL,
  `frequency` text DEFAULT 'monthly' NOT NULL,
  `notes` text,
  `is_active` integer DEFAULT true NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
