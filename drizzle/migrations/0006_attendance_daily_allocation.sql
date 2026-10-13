-- Reconcile daily derived overtime and preserve source times, records and immutable payroll results.
WITH allocations AS (
 SELECT id,MAX(0,SUM(worked_minutes) OVER (PARTITION BY employee_id,work_date ORDER BY julianday(clock_in),id ROWS UNBOUNDED PRECEDING)-480)-MAX(0,COALESCE(SUM(worked_minutes) OVER (PARTITION BY employee_id,work_date ORDER BY julianday(clock_in),id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0)-480) ot
 FROM attendance_records WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL AND worked_minutes IS NOT NULL
)
UPDATE attendance_records SET overtime_minutes=(SELECT ot FROM allocations WHERE allocations.id=attendance_records.id),updated_at='2026-10-13T00:00:00.000Z'
WHERE id IN (SELECT id FROM allocations) AND overtime_minutes IS NOT (SELECT ot FROM allocations WHERE allocations.id=attendance_records.id);
