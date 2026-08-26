ALTER TABLE `leave_balances` RENAME COLUMN "allocated_days" TO "allocated_half_days";--> statement-breakpoint
ALTER TABLE `leave_requests` RENAME COLUMN "days" TO "duration_half_days";--> statement-breakpoint
UPDATE `leave_balances` SET `allocated_half_days` = `allocated_half_days` * 2;--> statement-breakpoint
UPDATE `leave_requests` SET `duration_half_days` = `duration_half_days` * 2;--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`region` text DEFAULT 'MY-PENANG' NOT NULL,
	`observed` integer DEFAULT false NOT NULL,
	`source_url` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holidays_company_date_name_unique` ON `holidays` (`company_id`,`date`,`name`);--> statement-breakpoint
CREATE INDEX `holidays_company_date_idx` ON `holidays` (`company_id`,`date`);--> statement-breakpoint
CREATE TABLE `leave_balance_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`leave_type_id` text NOT NULL,
	`delta_half_days` integer NOT NULL,
	`reason` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leave_adjustments_employee_type_idx` ON `leave_balance_adjustments` (`employee_id`,`leave_type_id`);--> statement-breakpoint
ALTER TABLE `leave_balances` DROP COLUMN `used_days`;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `day_part` text DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `review_note` text;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `cancelled_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `cancelled_at` text;--> statement-breakpoint
CREATE INDEX `leave_requests_employee_dates_idx` ON `leave_requests` (`employee_id`,`start_date`,`end_date`);
