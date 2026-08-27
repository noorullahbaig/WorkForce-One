export const REQUIRED_MIGRATION = "0003_calendar_leave.sql";

export type DatabaseHealth = {
	ok: boolean;
	migration: "applied" | "pending";
	holidaysTable: "present" | "missing";
};

export async function getDatabaseHealth(db: D1Database): Promise<DatabaseHealth> {
	const migration = await db
		.prepare("SELECT 1 AS applied FROM d1_migrations WHERE name = ? LIMIT 1")
		.bind(REQUIRED_MIGRATION)
		.first<{ applied: number }>();
	const holidaysTable = await db
		.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'holidays' LIMIT 1")
		.first<{ present: number }>();
	const migrationStatus = migration ? "applied" : "pending";
	const tableStatus = holidaysTable ? "present" : "missing";
	return {
		ok: Boolean(migration && holidaysTable),
		migration: migrationStatus,
		holidaysTable: tableStatus,
	};
}
