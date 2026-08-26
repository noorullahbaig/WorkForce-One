export async function resetDemoData(db: D1Database) {
	const now = "2026-08-26T00:00:00.000Z";
	await db.batch([
		db.prepare("DELETE FROM attendance_records WHERE id NOT LIKE 'att-%'"),
		db.prepare("UPDATE attendance_records SET clock_in=CASE id WHEN 'att-001' THEN '2026-08-26T01:00:00.000Z' WHEN 'att-010' THEN '2026-08-25T02:00:00.000Z' ELSE clock_in END,clock_out=CASE WHEN id IN ('att-001','att-010') THEN NULL ELSE clock_out END,clock_out_method=CASE WHEN id IN ('att-001','att-010') THEN NULL ELSE clock_out_method END,worked_minutes=CASE WHEN id IN ('att-001','att-010') THEN NULL ELSE worked_minutes END,overtime_minutes=CASE WHEN id IN ('att-001','att-010') THEN NULL ELSE overtime_minutes END,status=CASE WHEN id IN ('att-001','att-010') THEN 'missing_clock_out' ELSE status END,updated_at=?").bind(now),
		db.prepare("DELETE FROM leave_requests WHERE id NOT LIKE 'lr-%'"),
		db.prepare("UPDATE leave_requests SET status=CASE id WHEN 'lr-001' THEN 'pending' ELSE 'approved' END,reviewed_by=CASE id WHEN 'lr-001' THEN NULL ELSE 'user-admin' END,reviewed_at=CASE id WHEN 'lr-001' THEN NULL ELSE reviewed_at END,review_note=NULL,cancelled_by=NULL,cancelled_at=NULL,updated_at=?").bind(now),
		db.prepare("DELETE FROM leave_balance_adjustments"),
		db.prepare("DELETE FROM holidays WHERE category='company'"),
		db.prepare("DELETE FROM payslips WHERE payroll_run_id='payroll-2026-08'"),
		db.prepare("DELETE FROM payroll_results WHERE payroll_run_id='payroll-2026-08'"),
		db.prepare("DELETE FROM employees WHERE id LIKE 'custom-%'"),
		db.prepare("UPDATE payroll_runs SET status='draft',gross_total_sen=0,deduction_total_sen=0,net_total_sen=0,employer_contribution_total_sen=0,idempotency_key=NULL,finalised_at=NULL,updated_at=? WHERE id='payroll-2026-08'").bind(now),
		db.prepare("DELETE FROM notifications WHERE id NOT LIKE 'note-%'"),
		db.prepare("UPDATE notifications SET read_at=CASE WHEN id='note-004' THEN '2026-08-26T01:05:00.000Z' ELSE NULL END"),
		db.prepare("DELETE FROM audit_events WHERE id NOT LIKE 'audit-%'"),
		db.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,'company-merdeka',NULL,'demo.reset','company','company-merdeka','{}',?)").bind(crypto.randomUUID(),new Date().toISOString()),
	]);
}
