import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { testDatabase } from "../../../tests/helpers/database";
import { addPayrollAdjustment, deletePayrollAdjustment } from "./adjustments.server";
import { finalisePayroll } from "./finalise.server";
import type { DemoUser } from "../../services/auth.server";
let fixture: Awaited<ReturnType<typeof testDatabase>>, db: D1Database;
const admin: DemoUser = { id: "user-admin", companyId: "company-merdeka", employeeId: null, role: "admin", name: "Admin", email: "admin@example.com" };
const input = { payrollRunId: "payroll-2026-08", employeeId: "emp-001", type: "bonus", amountRm: "12.34", description: "Performance bonus", reason: "Quarterly review" };
const now = "2026-08-28T00:00:00.000Z";
beforeAll(async () => {
  fixture = await testDatabase(); db = fixture.db;
  await db.batch([
    db.prepare("INSERT INTO companies(id,name,registration_number,timezone,created_at,updated_at) SELECT 'other','Other','OTHER',timezone,created_at,updated_at FROM companies LIMIT 1"),
    db.prepare("INSERT INTO employees(id,company_id,employee_code,full_name,email,phone,department,position,employment_type,salary_type,monthly_salary_sen,start_date,status,created_at,updated_at) SELECT 'other-employee','other','OTHER','Other','other@example.com',phone,department,position,employment_type,salary_type,monthly_salary_sen,start_date,status,created_at,updated_at FROM employees WHERE id='emp-001'"),
    db.prepare("INSERT INTO payroll_runs SELECT 'other-run','other',policy_id,period,period_start,period_end,pay_date,status,gross_total_sen,deduction_total_sen,net_total_sen,employer_contribution_total_sen,NULL,NULL,created_at,updated_at FROM payroll_runs WHERE id='payroll-2026-08'"),
    db.prepare("INSERT INTO payroll_adjustments VALUES ('other-adjustment','other-run','other-employee','bonus','Other',100,NULL,'now')"),
    db.prepare("INSERT INTO payroll_adjustments VALUES ('final-adjustment','payroll-2026-07','emp-001','bonus','Final',100,NULL,'now')"),
  ]);
},30000);
afterAll(async () => fixture?.dispose());
beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM payroll_adjustments WHERE id NOT IN ('adj-001','adj-002','adj-003','adj-004','other-adjustment','final-adjustment')"),
    db.prepare("DELETE FROM audit_events WHERE entity_type='payroll_adjustment'"),
    db.prepare("UPDATE payroll_runs SET status='draft' WHERE id='payroll-2026-08'"),
  ]);
});
it("adds a positive exact decimal amount and its audit atomically", async () => {
  expect(await addPayrollAdjustment(db,admin,input,now)).toHaveProperty('ok');
  const row = await db.prepare("SELECT * FROM payroll_adjustments WHERE description='Performance bonus'").first();
  expect(row).toMatchObject({ amount_sen:1234, employee_id:'emp-001', reason:'Quarterly review',created_at:now });
  expect(await db.prepare("SELECT * FROM audit_events WHERE entity_id=?").bind(row!.id).first()).toMatchObject({ company_id:admin.companyId,actor_user_id:admin.id,action:'payroll.adjustment_added',created_at:now });
});
it.each(['allowance','bonus','deduction','pcb'])("allows supported %s type", async (type) => {
  expect(await addPayrollAdjustment(db,admin,{...input,type},now)).toHaveProperty('ok');
});
it.each(['','0','-1','1.001','NaN','Infinity','1e3','12x','9007199254740992','90071992547409.92'])("rejects invalid amount %s", async (amountRm) => {
  expect(await addPayrollAdjustment(db,admin,{...input,amountRm},now)).toHaveProperty('error');
  expect(await db.prepare("SELECT count(*) n FROM audit_events WHERE entity_type='payroll_adjustment'").first()).toMatchObject({n:0});
});
it.each([
  {type:'unsupported'}, {description:'  '}, {payrollRunId:'missing'}, {employeeId:'missing'},
  {payrollRunId:'other-run'}, {employeeId:'other-employee'}, {payrollRunId:'payroll-2026-07'},
])("rejects invalid or inaccessible add input %j", async (changes) => {
  expect(await addPayrollAdjustment(db,admin,{...input,...changes},now)).toHaveProperty('error');
  expect(await db.prepare("SELECT count(*) n FROM audit_events WHERE entity_type='payroll_adjustment'").first()).toMatchObject({n:0});
});
it("rejects employee role and forged company for add and delete",async () => {
  for (const user of [{...admin,role:'employee' as const,employeeId:'emp-001'},{...admin,companyId:'other'}]) {
    expect(await addPayrollAdjustment(db,user,input,now)).toHaveProperty('error');
    expect(await deletePayrollAdjustment(db,user,'adj-001',now)).toHaveProperty('error');
  }
});
it.each(['missing','other-adjustment','final-adjustment'])("does not delete inaccessible or finalised adjustment %s",async id => {
  expect(await deletePayrollAdjustment(db,admin,id,now)).toHaveProperty('error');
  expect(await db.prepare("SELECT count(*) n FROM audit_events WHERE entity_type='payroll_adjustment'").first()).toMatchObject({n:0});
});
it("deletes own draft adjustment with its audit event",async () => {
  await addPayrollAdjustment(db,admin,input,now);
  const row = await db.prepare("SELECT id FROM payroll_adjustments WHERE description='Performance bonus'").first<{id:string}>();
  expect(await deletePayrollAdjustment(db,admin,row!.id,now)).toHaveProperty('ok');
  expect(await db.prepare("SELECT id FROM payroll_adjustments WHERE id=?").bind(row!.id).first()).toBeNull();
  expect(await db.prepare("SELECT * FROM audit_events WHERE action='payroll.adjustment_deleted'").first()).toMatchObject({entity_id:row!.id,company_id:admin.companyId,actor_user_id:admin.id});
});
it.each(['add','delete'] as const)("%s loses safely when finalisation commits first",async operation => {
  const wrapped = {prepare:db.prepare.bind(db),batch:async (statements:D1PreparedStatement[]) => {
    await db.prepare("UPDATE payroll_runs SET status='finalised' WHERE id='payroll-2026-08'").run();
    return db.batch(statements);
  }} as D1Database;
  const result = operation==='add' ? await addPayrollAdjustment(wrapped,admin,input,now) : await deletePayrollAdjustment(wrapped,admin,'adj-001',now);
  expect(result).toHaveProperty('error');
  expect(await db.prepare("SELECT id FROM payroll_adjustments WHERE id='adj-001'").first()).not.toBeNull();
  expect(await db.prepare("SELECT count(*) n FROM audit_events WHERE entity_type='payroll_adjustment'").first()).toMatchObject({n:0});
});

it.each(['add','delete'] as const)("finalisation rejects stale inputs when guarded %s commits first",async operation => {
  await db.prepare("UPDATE attendance_records SET clock_out=work_date||'T09:00:00.000Z',worked_minutes=480,overtime_minutes=0,status='present' WHERE id IN ('att-001','att-010')").run();
  await addPayrollAdjustment(db,admin,input,now);
  const row = await db.prepare("SELECT id FROM payroll_adjustments WHERE description='Performance bonus'").first<{id:string}>();
  const wrapped = {prepare:db.prepare.bind(db),batch:async (statements:D1PreparedStatement[]) => {
    const result = operation==='add' ? await addPayrollAdjustment(db,admin,input,now) : await deletePayrollAdjustment(db,admin,row!.id,now);
    expect(result).toHaveProperty('ok');
    return db.batch(statements);
  }} as D1Database;
  expect(await finalisePayroll(input.payrollRunId,admin,{DB:wrapped} as Env)).toHaveProperty('error');
  expect(await db.prepare("SELECT status FROM payroll_runs WHERE id='payroll-2026-08'").first()).toMatchObject({status:'draft'});
  expect(await db.prepare("SELECT count(*) n FROM payroll_results WHERE payroll_run_id='payroll-2026-08'").first()).toMatchObject({n:0});
});
it.each([['0.01',1],['0.29',29],['12',1200],[' 12.3 ',1230],['90071992547409.91',Number.MAX_SAFE_INTEGER]])("preserves exact safe sen for %s",async (amountRm, amountSen) => {
  expect(await addPayrollAdjustment(db,admin,{...input,amountRm},now)).toHaveProperty('ok');
  expect(await db.prepare("SELECT amount_sen FROM payroll_adjustments WHERE description='Performance bonus'").first()).toMatchObject({amount_sen:amountSen});
});
it("rejects deleting a cross-company employee adjustment even on an own-company draft",async () => {
  await db.prepare("INSERT INTO payroll_adjustments VALUES ('cross-company-adjustment','payroll-2026-08','other-employee','bonus','Cross',100,NULL,'now')").run();
  expect(await deletePayrollAdjustment(db,admin,'cross-company-adjustment',now)).toHaveProperty('error');
  expect(await db.prepare("SELECT id FROM payroll_adjustments WHERE id='cross-company-adjustment'").first()).not.toBeNull();
  expect(await db.prepare("SELECT count(*) n FROM audit_events WHERE entity_type='payroll_adjustment'").first()).toMatchObject({n:0});
});
