DROP INDEX `attendance_employee_date_unique`;--> statement-breakpoint
CREATE INDEX `attendance_employee_date_idx` ON `attendance_records` (`employee_id`,`work_date`);