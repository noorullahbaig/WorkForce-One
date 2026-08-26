import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
};

export const companies = sqliteTable("companies", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	registrationNumber: text("registration_number").notNull(),
	timezone: text("timezone").notNull().default("Asia/Kuala_Lumpur"),
	...timestamps,
});

export const employees = sqliteTable(
	"employees",
	{
		id: text("id").primaryKey(),
		companyId: text("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		employeeCode: text("employee_code").notNull(),
		fullName: text("full_name").notNull(),
		email: text("email").notNull(),
		phone: text("phone").notNull(),
		department: text("department").notNull(),
		position: text("position").notNull(),
		employmentType: text("employment_type", {
			enum: ["full_time", "part_time", "contract"],
		}).notNull(),
		salaryType: text("salary_type", { enum: ["monthly", "hourly"] }).notNull(),
		monthlySalarySen: integer("monthly_salary_sen"),
		hourlyRateSen: integer("hourly_rate_sen"),
		startDate: text("start_date").notNull(),
		status: text("status", { enum: ["active", "on_leave", "inactive"] })
			.notNull()
			.default("active"),
		statutoryProfile: text("statutory_profile")
			.notNull()
			.default("my_under_60"),
		...timestamps,
	},
	(table) => [
		uniqueIndex("employees_company_code_unique").on(
			table.companyId,
			table.employeeCode,
		),
		index("employees_company_name_idx").on(table.companyId, table.fullName),
	],
);

export const users = sqliteTable(
	"users",
	{
		id: text("id").primaryKey(),
		companyId: text("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		employeeId: text("employee_id").references(() => employees.id, {
			onDelete: "set null",
		}),
		name: text("name").notNull(),
		email: text("email").notNull(),
		role: text("role", { enum: ["admin", "employee"] }).notNull(),
		passwordHash: text("password_hash").notNull(),
		passwordSalt: text("password_salt").notNull(),
		active: integer("active", { mode: "boolean" }).notNull().default(true),
		...timestamps,
	},
	(table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = sqliteTable(
	"sessions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tokenHash: text("token_hash").notNull(),
		expiresAt: text("expires_at").notNull(),
		createdAt: text("created_at").notNull(),
	},
	(table) => [uniqueIndex("sessions_token_hash_unique").on(table.tokenHash)],
);

export const attendanceRecords = sqliteTable(
	"attendance_records",
	{
		id: text("id").primaryKey(),
		employeeId: text("employee_id")
			.notNull()
			.references(() => employees.id, { onDelete: "cascade" }),
		workDate: text("work_date").notNull(),
		clockIn: text("clock_in"),
		clockOut: text("clock_out"),
		clockInMethod: text("clock_in_method", { enum: ["fingerprint", "qr", "manual"] }),
		clockOutMethod: text("clock_out_method", { enum: ["fingerprint", "qr", "manual"] }),
		workedMinutes: integer("worked_minutes"),
		overtimeMinutes: integer("overtime_minutes"),
		status: text("status", {
			enum: ["present", "late", "absent", "on_leave", "missing_clock_out"],
		}).notNull(),
		...timestamps,
	},
	(table) => [
		uniqueIndex("attendance_employee_date_unique").on(
			table.employeeId,
			table.workDate,
		),
		index("attendance_work_date_idx").on(table.workDate),
	],
);

export const leaveTypes = sqliteTable("leave_types", {
	id: text("id").primaryKey(),
	companyId: text("company_id")
		.notNull()
		.references(() => companies.id, { onDelete: "cascade" }),
	code: text("code").notNull(),
	name: text("name").notNull(),
	paid: integer("paid", { mode: "boolean" }).notNull(),
	defaultDays: integer("default_days").notNull(),
});

export const leaveBalances = sqliteTable(
	"leave_balances",
	{
		employeeId: text("employee_id")
			.notNull()
			.references(() => employees.id, { onDelete: "cascade" }),
		leaveTypeId: text("leave_type_id")
			.notNull()
			.references(() => leaveTypes.id, { onDelete: "cascade" }),
		allocatedDays: integer("allocated_days").notNull(),
		usedDays: integer("used_days").notNull().default(0),
	},
	(table) => [primaryKey({ columns: [table.employeeId, table.leaveTypeId] })],
);

export const leaveRequests = sqliteTable(
	"leave_requests",
	{
		id: text("id").primaryKey(),
		employeeId: text("employee_id")
			.notNull()
			.references(() => employees.id, { onDelete: "cascade" }),
		leaveTypeId: text("leave_type_id")
			.notNull()
			.references(() => leaveTypes.id),
		startDate: text("start_date").notNull(),
		endDate: text("end_date").notNull(),
		days: integer("days").notNull(),
		reason: text("reason").notNull(),
		status: text("status", { enum: ["pending", "approved", "rejected"] })
			.notNull()
			.default("pending"),
		reviewedBy: text("reviewed_by").references(() => users.id),
		reviewedAt: text("reviewed_at"),
		...timestamps,
	},
	(table) => [index("leave_requests_status_idx").on(table.status)],
);

export const payrollPolicies = sqliteTable("payroll_policies", {
	id: text("id").primaryKey(),
	companyId: text("company_id")
		.notNull()
		.references(() => companies.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	effectiveFrom: text("effective_from").notNull(),
	verificationDate: text("verification_date").notNull(),
	sourceUrlsJson: text("source_urls_json").notNull(),
	normalDayMinutes: integer("normal_day_minutes").notNull().default(480),
	overtimeMultiplierBasisPoints: integer("overtime_multiplier_basis_points")
		.notNull()
		.default(15000),
	locked: integer("locked", { mode: "boolean" }).notNull().default(false),
	active: integer("active", { mode: "boolean" }).notNull().default(false),
	...timestamps,
});

export const contributionBands = sqliteTable(
	"contribution_bands",
	{
		id: text("id").primaryKey(),
		policyId: text("policy_id")
			.notNull()
			.references(() => payrollPolicies.id, { onDelete: "cascade" }),
		scheme: text("scheme", { enum: ["epf", "socso", "eis"] }).notNull(),
		minWageSen: integer("min_wage_sen").notNull(),
		maxWageSen: integer("max_wage_sen"),
		employeeSen: integer("employee_sen").notNull(),
		employerSen: integer("employer_sen").notNull(),
	},
	(table) => [index("contribution_bands_policy_scheme_idx").on(table.policyId, table.scheme)],
);

export const payrollRuns = sqliteTable(
	"payroll_runs",
	{
		id: text("id").primaryKey(),
		companyId: text("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		policyId: text("policy_id")
			.notNull()
			.references(() => payrollPolicies.id),
		period: text("period").notNull(),
		periodStart: text("period_start").notNull(),
		periodEnd: text("period_end").notNull(),
		payDate: text("pay_date").notNull(),
		status: text("status", { enum: ["draft", "finalised"] }).notNull(),
		grossTotalSen: integer("gross_total_sen").notNull().default(0),
		deductionTotalSen: integer("deduction_total_sen").notNull().default(0),
		netTotalSen: integer("net_total_sen").notNull().default(0),
		employerContributionTotalSen: integer("employer_contribution_total_sen")
			.notNull()
			.default(0),
		idempotencyKey: text("idempotency_key"),
		finalisedAt: text("finalised_at"),
		...timestamps,
	},
	(table) => [
		uniqueIndex("payroll_company_period_unique").on(table.companyId, table.period),
		uniqueIndex("payroll_idempotency_unique").on(table.idempotencyKey),
	],
);

export const payrollAdjustments = sqliteTable("payroll_adjustments", {
	id: text("id").primaryKey(),
	payrollRunId: text("payroll_run_id")
		.notNull()
		.references(() => payrollRuns.id, { onDelete: "cascade" }),
	employeeId: text("employee_id")
		.notNull()
		.references(() => employees.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["allowance", "bonus", "deduction", "pcb"] }).notNull(),
	description: text("description").notNull(),
	amountSen: integer("amount_sen").notNull(),
	reason: text("reason"),
	createdAt: text("created_at").notNull(),
});

export const payrollResults = sqliteTable(
	"payroll_results",
	{
		id: text("id").primaryKey(),
		payrollRunId: text("payroll_run_id")
			.notNull()
			.references(() => payrollRuns.id, { onDelete: "cascade" }),
		employeeId: text("employee_id")
			.notNull()
			.references(() => employees.id, { onDelete: "cascade" }),
		inputSnapshotJson: text("input_snapshot_json").notNull(),
		breakdownJson: text("breakdown_json").notNull(),
		grossPaySen: integer("gross_pay_sen").notNull(),
		totalDeductionsSen: integer("total_deductions_sen").notNull(),
		netPaySen: integer("net_pay_sen").notNull(),
		employerContributionsSen: integer("employer_contributions_sen").notNull(),
		createdAt: text("created_at").notNull(),
	},
	(table) => [
		uniqueIndex("payroll_result_run_employee_unique").on(
			table.payrollRunId,
			table.employeeId,
		),
	],
);

export const payslips = sqliteTable(
	"payslips",
	{
		id: text("id").primaryKey(),
		payrollResultId: text("payroll_result_id")
			.notNull()
			.references(() => payrollResults.id, { onDelete: "cascade" }),
		payrollRunId: text("payroll_run_id")
			.notNull()
			.references(() => payrollRuns.id, { onDelete: "cascade" }),
		employeeId: text("employee_id")
			.notNull()
			.references(() => employees.id, { onDelete: "cascade" }),
		createdAt: text("created_at").notNull(),
	},
	(table) => [uniqueIndex("payslip_result_unique").on(table.payrollResultId)],
);

export const notifications = sqliteTable(
	"notifications",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		body: text("body").notNull(),
		href: text("href"),
		readAt: text("read_at"),
		createdAt: text("created_at").notNull(),
	},
	(table) => [index("notifications_user_read_idx").on(table.userId, table.readAt)],
);

export const auditEvents = sqliteTable("audit_events", {
	id: text("id").primaryKey(),
	companyId: text("company_id")
		.notNull()
		.references(() => companies.id, { onDelete: "cascade" }),
	actorUserId: text("actor_user_id").references(() => users.id),
	action: text("action").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	metadataJson: text("metadata_json").notNull().default("{}"),
	createdAt: text("created_at").notNull(),
});

export const loginAttempts = sqliteTable(
	"login_attempts",
	{
		keyHash: text("key_hash").primaryKey(),
		attempts: integer("attempts").notNull(),
		windowStartedAt: text("window_started_at").notNull(),
	},
);
