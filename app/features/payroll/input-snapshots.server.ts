// Read the exact calculation inputs and compare the same ordered SQL at atomic commit.
// Include IDs so inserts and deletes are detected even when totals happen to match.
export const employeePaySnapshotSql = `SELECT json_group_array(json_object(
 'id',e.id,'fullName',e.full_name,'salaryType',e.salary_type,
 'monthlySalarySen',e.monthly_salary_sen,'hourlyRateSen',e.hourly_rate_sen)) snapshot
 FROM (SELECT * FROM employees WHERE company_id=? AND status!='inactive' ORDER BY id) e`;
export const adjustmentSnapshotSql = `SELECT json_group_array(json_object(
 'id',a.id,'employeeId',a.employee_id,'type',a.type,'amountSen',a.amount_sen)) snapshot
 FROM (SELECT a.* FROM payroll_adjustments a JOIN employees e ON e.id=a.employee_id
 WHERE a.payroll_run_id=? AND e.company_id=? ORDER BY a.id) a`;
export const holidayInputSnapshotSql = `SELECT json_group_array(json_object(
 'id',h.id,'date',h.date)) snapshot
 FROM (SELECT id,date FROM holidays WHERE company_id=? AND active=1 AND date>=? AND date<=? ORDER BY id) h`;
export const unpaidLeaveSnapshotSql = `SELECT json_group_array(json_object(
 'id',l.id,'employeeId',l.employee_id,'startDate',l.start_date,'endDate',l.end_date,'dayPart',l.day_part)) snapshot
 FROM (SELECT l.* FROM leave_requests l JOIN leave_types t ON t.id=l.leave_type_id JOIN employees e ON e.id=l.employee_id
 WHERE e.company_id=? AND l.status='approved' AND t.paid=0 ORDER BY l.id) l`;
export async function readInputSnapshot<T>(db: D1Database, sql: string, bindings: string[]) {
  const row = await db.prepare(sql).bind(...bindings).first<{ snapshot: string }>();
  const snapshot = row?.snapshot ?? "[]";
  return { snapshot, results: JSON.parse(snapshot) as T[] };
}
