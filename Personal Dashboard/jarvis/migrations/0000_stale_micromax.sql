CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`problem_statement` text NOT NULL,
	`target_customer` text DEFAULT '' NOT NULL,
	`customer_type` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`discovered_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`mode` text,
	`recommendation` text,
	`recommendation_reason` text,
	`thesis_problem` text,
	`thesis_who` text,
	`thesis_why_hurts` text,
	`thesis_why_pay` text,
	`thesis_why_now` text,
	`scorecard` text,
	`alternatives` text,
	`validation_plan` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_opportunities_status` ON `opportunities` (`status`);--> statement-breakpoint
CREATE INDEX `idx_opportunities_discovered_at` ON `opportunities` (`discovered_at`);--> statement-breakpoint
CREATE TABLE `opportunity_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`platform` text,
	`signal_type` text,
	`author` text,
	`observed_at` text,
	`summary` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_opportunity_id` ON `opportunity_evidence` (`opportunity_id`);--> statement-breakpoint
CREATE TABLE `opportunity_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`note_type` text DEFAULT 'research' NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notes_opportunity_id` ON `opportunity_notes` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `idx_notes_type` ON `opportunity_notes` (`note_type`);--> statement-breakpoint
CREATE TABLE `validation_checklist` (
	`opportunity_id` text PRIMARY KEY NOT NULL,
	`users_identified` integer DEFAULT 0 NOT NULL,
	`conversations_completed` integer DEFAULT 0 NOT NULL,
	`problem_confirmed` integer DEFAULT 0 NOT NULL,
	`solution_requested` integer DEFAULT 0 NOT NULL,
	`willingness_to_pay_signal` integer DEFAULT 0 NOT NULL,
	`workaround_documented` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
