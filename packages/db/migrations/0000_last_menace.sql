CREATE TABLE `checkins` (
	`id` integer PRIMARY KEY NOT NULL,
	`gym_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`at` text NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checkins_member_at` ON `checkins` (`member_id`,`at`);--> statement-breakpoint
CREATE TABLE `gyms` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`timezone` text DEFAULT 'America/Chicago' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`pilot_started_on` text NOT NULL,
	`plan` text DEFAULT 'pilot' NOT NULL,
	`kiosk_token` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gyms_slug_unique` ON `gyms` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `gyms_kiosk_token_unique` ON `gyms` (`kiosk_token`);--> statement-breakpoint
CREATE TABLE `invites` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`gym_id` integer NOT NULL,
	`role` text DEFAULT 'coach' NOT NULL,
	`name` text NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invites_role_check" CHECK("invites"."role" IN ('owner', 'coach'))
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY NOT NULL,
	`gym_id` integer NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`phone` text,
	`email` text,
	`joined_on` text NOT NULL,
	`coach_id` integer,
	`external_id` text,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_gym_phone_unique` ON `members` (`gym_id`,`phone`);--> statement-breakpoint
CREATE INDEX `members_gym_coach` ON `members` (`gym_id`,`coach_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_gym_external_id_unique` ON `members` (`gym_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `nudges` (
	`id` integer PRIMARY KEY NOT NULL,
	`gym_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`template_id` integer,
	`body` text NOT NULL,
	`channel` text DEFAULT 'own-phone' NOT NULL,
	`sent_at` text NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `nudges_member_sent` ON `nudges` (`member_id`,`sent_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` integer PRIMARY KEY NOT NULL,
	`gym_id` integer NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`sort` integer NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`gym_id` integer NOT NULL,
	`email` text COLLATE NOCASE NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gym_id`) REFERENCES `gyms`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('owner', 'coach'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);