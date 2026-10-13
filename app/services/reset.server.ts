import { DEMO_COMPANY_ID, demoBusinessFixture } from "../db/demo-fixture";

/** Restore demo business data atomically, preserving authentication and other companies. */
export async function resetDemoData(db: D1Database) {
 const statements: D1PreparedStatement[] = [];
 const employeeScope = "SELECT id FROM employees WHERE company_id=?";
 const runScope = "SELECT id FROM payroll_runs WHERE company_id=?";
 const policyScope = "SELECT id FROM payroll_policies WHERE company_id=?";
 const remove = (table: string, scope: string) => statements.push(db.prepare(`DELETE FROM ${table} WHERE ${scope}`).bind(DEMO_COMPANY_ID));
 // Delete children first: D1 batches enforce foreign keys throughout the transaction.
 remove("attendance_correction_requests", "company_id=?");
 remove("payslips", `payroll_run_id IN (${runScope})`);
 remove("payroll_results", `payroll_run_id IN (${runScope})`);
 remove("payroll_adjustments", `payroll_run_id IN (${runScope})`);
 remove("payroll_runs", "company_id=?");
 remove("contribution_bands", `policy_id IN (${policyScope})`);
 remove("payroll_policies", "company_id=?");
 remove("leave_balance_adjustments", `employee_id IN (${employeeScope})`);
 remove("leave_requests", `employee_id IN (${employeeScope})`);
 remove("leave_balances", `employee_id IN (${employeeScope})`);
 remove("leave_types", "company_id=?");
 remove("attendance_records", `employee_id IN (${employeeScope})`);
 remove("holidays", "company_id=?");
 remove("notifications", "user_id IN (SELECT id FROM users WHERE company_id=?)");
 remove("audit_events", "company_id=?");
 const employeeIds = demoBusinessFixture.employees.map(row => row.id);
 // Retain auth-linked custom employee identities so users.employee_id stays intact.
 statements.push(db.prepare(`DELETE FROM employees WHERE company_id=? AND id NOT IN (${employeeIds.map(() => "?").join(",")}) AND NOT EXISTS (SELECT 1 FROM users WHERE users.employee_id=employees.id)`).bind(DEMO_COMPANY_ID, ...employeeIds));
 for (const [table, rows] of Object.entries(demoBusinessFixture)) {
  for (const row of rows) {
   const columns = Object.keys(row);
   const conflict = table === "leave_balances" ? "employee_id,leave_type_id" : "id";
   const updates = columns.filter(column => !conflict.split(",").includes(column)).map(column => `${column}=excluded.${column}`).join(",");
   statements.push(db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates}`).bind(...Object.values(row)));
  }
 }
 statements.push(db.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,NULL,'demo.reset','company',?,'{}',?)").bind(crypto.randomUUID(), DEMO_COMPANY_ID, DEMO_COMPANY_ID, new Date().toISOString()));
 await db.batch(statements);
}
