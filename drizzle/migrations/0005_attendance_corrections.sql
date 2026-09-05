CREATE TABLE `attendance_correction_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`attendance_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`work_date` text NOT NULL,
	`original_clock_in` text,
	`original_clock_out` text,
	`original_clock_in_method` text,
	`original_clock_out_method` text,
	`original_status` text NOT NULL,
	`original_worked_minutes` integer,
	`original_overtime_minutes` integer,
	`original_updated_at` text NOT NULL,
	`proposed_clock_in` text NOT NULL,
	`proposed_clock_out` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`rejection_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attendance_id`) REFERENCES `attendance_records`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "attendance_correction_status_check" CHECK("attendance_correction_requests"."status" IN ('pending','approved','rejected')),
	CONSTRAINT "attendance_correction_reason_check" CHECK(length(trim("attendance_correction_requests"."reason")) BETWEEN 1 AND 2000),
	CONSTRAINT "attendance_correction_review_check" CHECK(("attendance_correction_requests"."status" = 'pending' AND "attendance_correction_requests"."reviewed_by" IS NULL AND "attendance_correction_requests"."reviewed_at" IS NULL) OR ("attendance_correction_requests"."status" IN ('approved','rejected') AND "attendance_correction_requests"."reviewed_by" IS NOT NULL AND "attendance_correction_requests"."reviewed_at" IS NOT NULL)),
	CONSTRAINT "attendance_correction_rejection_check" CHECK("attendance_correction_requests"."status" != 'rejected' OR ("attendance_correction_requests"."rejection_reason" IS NOT NULL AND length(trim("attendance_correction_requests"."rejection_reason")) BETWEEN 1 AND 2000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_correction_pending_unique` ON `attendance_correction_requests` (`attendance_id`) WHERE "attendance_correction_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX `attendance_correction_company_status_idx` ON `attendance_correction_requests` (`company_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `attendance_correction_employee_idx` ON `attendance_correction_requests` (`employee_id`,`created_at`);