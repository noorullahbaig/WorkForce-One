export const REQUIRED_MIGRATION = "0005_attendance_corrections.sql";

export type DatabaseHealth = {
  ok: boolean;
  migration: "applied" | "pending";
  holidaysTable: "present" | "missing";
  leaveBackdate: "present" | "missing";
  attendanceCorrections: "present" | "missing";
};

export async function getDatabaseHealth(
  db: D1Database,
): Promise<DatabaseHealth> {
  const migration = await db
    .prepare("SELECT 1 AS applied FROM d1_migrations WHERE name = ? LIMIT 1")
    .bind(REQUIRED_MIGRATION)
    .first<{ applied: number }>();
  const holidaysTable = await db
    .prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'holidays' LIMIT 1",
    )
    .first<{ present: number }>();

  let leaveBackdate: "present" | "missing";
  try {
    await db
      .prepare("SELECT leave_backdate_days FROM companies LIMIT 1")
      .first();
    leaveBackdate = "present";
  } catch {
    leaveBackdate = "missing";
  }

  const corrections = await db
    .prepare(
      "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='attendance_correction_requests' LIMIT 1",
    )
    .first();
  const migrationStatus = migration ? "applied" : "pending";
  const tableStatus = holidaysTable ? "present" : "missing";
  return {
    ok: Boolean(
      migration && holidaysTable && corrections && leaveBackdate === "present",
    ),
    migration: migrationStatus,
    holidaysTable: tableStatus,
    leaveBackdate,
    attendanceCorrections: corrections ? "present" : "missing",
  };
}
