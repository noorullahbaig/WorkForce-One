import type { AttendanceInput } from "./attendance-inputs";
// Stable ordering and the full attendance inputs detect inserts, deletes and edits at commit.
export const attendanceSnapshotSql = `SELECT json_group_array(json_object(
 'id',a.id,'employeeId',a.employee_id,'workDate',a.work_date,'clockIn',a.clock_in,'clockOut',a.clock_out,
 'workedMinutes',a.worked_minutes,'overtimeMinutes',a.overtime_minutes,'status',a.status,'updatedAt',a.updated_at)) snapshot
 FROM (SELECT a.* FROM attendance_records a JOIN employees e ON e.id=a.employee_id
 WHERE e.company_id=? AND a.work_date>=? AND a.work_date<=? ORDER BY a.id) a`;
export async function payrollAttendance(
  db: D1Database,
  companyId: string,
  start: string,
  end: string,
) {
  const result = await db
    .prepare(attendanceSnapshotSql)
    .bind(companyId, start, end)
    .first<{ snapshot: string }>();
  const snapshot = result?.snapshot ?? "[]";
  return {
    snapshot,
    records: JSON.parse(snapshot) as (AttendanceInput & { status: string })[],
  };
}
