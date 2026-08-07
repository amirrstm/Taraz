CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `sms_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raw_text` text NOT NULL,
	`body_hash` text NOT NULL,
	`sender` text,
	`received_at` integer NOT NULL,
	`parse_ok` integer NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `sms_log_hash_time` ON `sms_log` (`body_hash`,`received_at`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` integer NOT NULL,
	`direction` text NOT NULL,
	`account_tail` text,
	`balance_after` integer,
	`occurred_at` integer NOT NULL,
	`category_id` integer,
	`status` text DEFAULT 'uncategorized' NOT NULL,
	`source` text DEFAULT 'sms' NOT NULL,
	`description` text,
	`note` text,
	`sms_log_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sms_log_id`) REFERENCES `sms_log`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tx_status` ON `transactions` (`status`);--> statement-breakpoint
CREATE INDEX `tx_occurred_at` ON `transactions` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `tx_category` ON `transactions` (`category_id`);