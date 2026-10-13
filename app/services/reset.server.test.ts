import { afterEach, describe, expect, test } from "vitest";
import { testDatabase } from "../../tests/helpers/database";
import { demoBusinessFixture } from "../db/demo-fixture";
import { resetDemoData } from "./reset.server";

let dispose: (() => Promise<void>) | undefined;
afterEach(async () => { await dispose?.(); });
describe("demo reset", () => {
 test("restores edited seed records and adjustments without touching auth or another company", async () => {
  const fixture = await testDatabase(); dispose = fixture.dispose; const { db } = fixture;
  await db.prepare("INSERT INTO companies SELECT 'other-company','Other','OTHER',timezone,created_at,updated_at,leave_backdate_days FROM companies LIMIT 1").run();
  await db.prepare("INSERT INTO holidays SELECT 'other-holiday','other-company',name,date,category,region,observed,source_url,active,created_at,updated_at FROM holidays LIMIT 1").run();
  await db.prepare("UPDATE users SET email='changed@example.com' WHERE id='user-admin'").run();
  await db.prepare("UPDATE employees SET full_name='Changed',status='inactive',bank_account_number='000000' WHERE id='emp-007'").run();
  await db.prepare("UPDATE payroll_adjustments SET amount_sen=1 WHERE id='adj-001'").run();
  await db.prepare("INSERT INTO payroll_adjustments SELECT 'custom-adjustment',payroll_run_id,employee_id,type,description,amount_sen,reason,created_at FROM payroll_adjustments LIMIT 1").run();
  await db.prepare("UPDATE holidays SET active=0 WHERE id='holiday-2026-national'").run();
  await db.prepare("UPDATE leave_requests SET reason='changed',review_note='changed' WHERE id='lr-002'").run();
  await db.prepare("INSERT INTO employees SELECT 'custom-worker',company_id,'CUSTOM','Custom',email,phone,department,position,employment_type,salary_type,monthly_salary_sen,hourly_rate_sen,start_date,status,statutory_profile,ic_number,epf_number,tax_number,bank_name,bank_account_number,created_at,updated_at FROM employees LIMIT 1").run();
  await db.prepare("INSERT INTO payroll_adjustments SELECT 'custom-worker-adjustment',payroll_run_id,'custom-worker',type,description,amount_sen,reason,created_at FROM payroll_adjustments LIMIT 1").run();
  await db.prepare("INSERT INTO attendance_records SELECT 'custom-attendance','custom-worker',work_date,clock_in,clock_out,clock_in_method,clock_out_method,worked_minutes,overtime_minutes,status,created_at,updated_at FROM attendance_records WHERE id='att-001'").run();
  await db.prepare(`INSERT INTO attendance_correction_requests (id,company_id,employee_id,attendance_id,requested_by,work_date,original_status,original_updated_at,proposed_clock_in,proposed_clock_out,reason,status,created_at,updated_at) VALUES ('custom-correction','company-merdeka','custom-worker','custom-attendance','user-admin','2026-08-26','missing_clock_out','2026-08-26T01:00:00.000Z','2026-08-26T01:00:00.000Z','2026-08-26T09:00:00.000Z','Forgot clock-out','pending','2026-08-26T10:00:00.000Z','2026-08-26T10:00:00.000Z')`).run();
  await db.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at) VALUES ('session-reset','user-admin','hash-reset','2099-01-01','2026-01-01')").run();
  await resetDemoData(db);
  expect(await db.prepare("SELECT id FROM employees WHERE id='custom-worker'").first()).toBeNull();
  expect(await db.prepare("SELECT id FROM sessions WHERE id='session-reset'").first()).toEqual({id:'session-reset'});
  for (const [table, rows] of Object.entries(demoBusinessFixture)) {
   for (const row of rows) {
    const keys = table === "leave_balances" ? ["employee_id", "leave_type_id"] : ["id"];
    const actual = await db.prepare(`SELECT * FROM ${table} WHERE ${keys.map(key => `${key}=?`).join(" AND ")}`).bind(...keys.map(key => row[key])).first();
    expect(actual, `${table} baseline`).toEqual(row);
   }
  }
  // Repeated resets leave a stable baseline and a single reset audit event.
  await resetDemoData(db);
  expect((await db.prepare("SELECT id FROM audit_events WHERE action='demo.reset'").all()).results).toHaveLength(1);

  expect(await db.prepare("SELECT full_name,status FROM employees WHERE id='emp-007'").first()).toEqual({full_name:'Mei Ling Wong',status:'on_leave'});
  expect(await db.prepare("SELECT amount_sen FROM payroll_adjustments WHERE id='adj-001'").first()).toEqual({amount_sen:30000});
  expect(await db.prepare("SELECT id FROM payroll_adjustments WHERE id='custom-adjustment'").first()).toBeNull();
  expect(await db.prepare("SELECT active FROM holidays WHERE id='holiday-2026-national'").first()).toEqual({active:1});
  expect(await db.prepare("SELECT reason,review_note FROM leave_requests WHERE id='lr-002'").first()).toEqual({reason:'Family holiday',review_note:null});
  expect(await db.prepare("SELECT email FROM users WHERE id='user-admin'").first()).toEqual({email:'changed@example.com'});
  expect(await db.prepare("SELECT id FROM holidays WHERE id='other-holiday'").first()).toEqual({id:'other-holiday'});
 }, 30000);
});
