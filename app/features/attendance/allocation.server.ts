// Integer worked minutes are authoritative; allocate daily overtime in the same D1 transaction as a mutation.
export function reallocateDay(db:D1Database,employeeId:string,workDate:string,now:string,guard='1=1',guardValues:unknown[]=[]):D1PreparedStatement {
 return db.prepare(`WITH allocations AS (
 SELECT id,MAX(0,SUM(worked_minutes) OVER (ORDER BY julianday(clock_in),id ROWS UNBOUNDED PRECEDING)-480)-MAX(0,COALESCE(SUM(worked_minutes) OVER (ORDER BY julianday(clock_in),id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0)-480) ot
 FROM attendance_records WHERE employee_id=? AND work_date=? AND clock_in IS NOT NULL AND clock_out IS NOT NULL AND worked_minutes IS NOT NULL)
 UPDATE attendance_records SET overtime_minutes=(SELECT ot FROM allocations WHERE allocations.id=attendance_records.id),updated_at=?
 WHERE id IN (SELECT id FROM allocations) AND overtime_minutes IS NOT (SELECT ot FROM allocations WHERE allocations.id=attendance_records.id) AND (${guard})`).bind(employeeId,workDate,now,...guardValues);
}
export const daySnapshotSql=`SELECT json_group_array(json_object('id',id,'clockIn',clock_in,'clockOut',clock_out,'worked',worked_minutes,'overtime',overtime_minutes,'status',status,'updated',updated_at)) FROM (SELECT * FROM attendance_records WHERE employee_id=? AND work_date=? ORDER BY id)`;
export async function daySnapshot(db:D1Database,employeeId:string,day:string){return (await db.prepare(`SELECT (${daySnapshotSql}) snapshot`).bind(employeeId,day).first<{snapshot:string}>())?.snapshot??'[]'}
