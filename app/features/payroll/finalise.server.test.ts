import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { testDatabase } from "../../../tests/helpers/database";
import { finalisePayroll } from "./finalise.server";
import {
  submitCorrection,
  reviewCorrection,
  listCorrections,
} from "../attendance/corrections.server";
import type { DemoUser } from "../../services/auth.server";
let fixture: Awaited<ReturnType<typeof testDatabase>>, db: D1Database;
const admin: DemoUser = {
  id: "user-admin",
  companyId: "company-merdeka",
  employeeId: null,
  role: "admin",
  name: "Admin",
  email: "admin@workforceone.demo",
};
const employee: DemoUser = {
  ...admin,
  id: "user-employee",
  employeeId: "emp-001",
  role: "employee",
  name: "Farah",
};
const submit = () =>
  submitCorrection(db, employee, {
    attendanceId: "att-001",
    clockIn: "2026-08-26T09:00",
    clockOut: "2026-08-26T18:00",
    reason: "Incorrect end time",
  });
const finalise = (database = db) =>
  finalisePayroll("payroll-2026-08", admin, { DB: database } as Env);
beforeAll(async () => {
  fixture = await testDatabase();
  db = fixture.db;
}, 30000);
afterAll(async () => {
  await fixture?.dispose();
});
beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM attendance_correction_requests"),
    db.prepare("DELETE FROM payslips WHERE payroll_run_id='payroll-2026-08'"),
    db.prepare(
      "DELETE FROM payroll_results WHERE payroll_run_id='payroll-2026-08'",
    ),
    db.prepare(
      "UPDATE payroll_runs SET status='draft',idempotency_key=NULL,finalised_at=NULL WHERE id='payroll-2026-08'",
    ),
    db.prepare(
      "UPDATE attendance_records SET clock_out=work_date||'T09:00:00.000Z',worked_minutes=480,overtime_minutes=0,status='present' WHERE id IN ('att-001','att-010')",
    ),
    db.prepare("DELETE FROM attendance_records WHERE id='outside-period'"),
  ]);
});
it("blocks pending requests and allows finalisation after rejection", async () => {
  await submit();
  expect(await finalise()).toHaveProperty("error");
  const [r] = await listCorrections(db, employee);
  await reviewCorrection(db, admin, r.id, "rejected", "Check the time");
  expect(await finalise()).toHaveProperty("ok");
});
it("does not block on missing clock-outs outside the payroll period", async () => {
  await db
    .prepare(
      "INSERT INTO attendance_records(id,employee_id,work_date,clock_in,status,created_at,updated_at) VALUES ('outside-period','emp-001','2026-09-01','2026-09-01T01:00:00Z','missing_clock_out','now','now')",
    )
    .run();
  expect(await finalise()).toHaveProperty("ok");
});
it("does not finalise another company payroll", async () => {
  expect(
    await finalisePayroll("payroll-2026-08", { ...admin, companyId: "other" }, {
      DB: db,
    } as Env),
  ).toHaveProperty("error");
});
it("rejects stale payroll input even when an intervening correction is already approved", async () => {
  const wrapped = {
    prepare: db.prepare.bind(db),
    batch: async (statements: D1PreparedStatement[]) => {
      await submit();
      const [r] = await listCorrections(db, employee);
      await reviewCorrection(db, admin, r.id, "approved", "");
      return db.batch(statements);
    },
  } as D1Database;
  expect(await finalise(wrapped)).toHaveProperty("error");
  expect(
    (
      await db
        .prepare(
          "SELECT count(*) n FROM payroll_results WHERE payroll_run_id='payroll-2026-08'",
        )
        .first()
    )?.n,
  ).toBe(0);
  expect(
    (
      await db
        .prepare("SELECT status FROM payroll_runs WHERE id='payroll-2026-08'")
        .first()
    )?.status,
  ).toBe("draft");
});
it("blocks a request submitted between payroll read and commit", async () => {
  const wrapped = {
    prepare: db.prepare.bind(db),
    batch: async (statements: D1PreparedStatement[]) => {
      await submit();
      return db.batch(statements);
    },
  } as D1Database;
  expect(await finalise(wrapped)).toHaveProperty("error");
});
it("preserves finalised snapshots and payslips after a historical approval", async () => {
  await finalise();
  const before = await db
    .prepare(
      "SELECT * FROM payroll_results WHERE payroll_run_id='payroll-2026-08' ORDER BY id",
    )
    .all();
  const payslips = await db
    .prepare(
      "SELECT * FROM payslips WHERE payroll_run_id='payroll-2026-08' ORDER BY id",
    )
    .all();
  const run = await db
    .prepare("SELECT * FROM payroll_runs WHERE id='payroll-2026-08'")
    .first();
  await submit();
  const [r] = await listCorrections(db, employee);
  expect(await reviewCorrection(db, admin, r.id, "approved", "")).toMatchObject(
    { ok: expect.stringContaining("finalised payroll") },
  );
  expect(
    (
      await db
        .prepare(
          "SELECT * FROM payroll_results WHERE payroll_run_id='payroll-2026-08' ORDER BY id",
        )
        .all()
    ).results,
  ).toEqual(before.results);
  expect(
    (
      await db
        .prepare(
          "SELECT * FROM payslips WHERE payroll_run_id='payroll-2026-08' ORDER BY id",
        )
        .all()
    ).results,
  ).toEqual(payslips.results);
  expect(
    await db
      .prepare("SELECT * FROM payroll_runs WHERE id='payroll-2026-08'")
      .first(),
  ).toEqual(run);
});

it.each([
  ["adjustment amount", "UPDATE payroll_adjustments SET amount_sen=amount_sen+1 WHERE id='adj-001'"],
  ["adjustment insertion", "INSERT INTO payroll_adjustments(id,payroll_run_id,employee_id,type,description,amount_sen,created_at) VALUES ('racing-adjustment','payroll-2026-08','emp-001','bonus','Race',100,'now')"],
  ["adjustment deletion", "DELETE FROM payroll_adjustments WHERE id='adj-002'"],
  ["monthly salary", "UPDATE employees SET monthly_salary_sen=monthly_salary_sen+100 WHERE id='emp-001'"],
  ["hourly rate", "UPDATE employees SET hourly_rate_sen=hourly_rate_sen+100 WHERE id='emp-010'"],
  ["employee status", "UPDATE employees SET status='inactive' WHERE id='emp-003'"],
])("rejects a racing %s edit without writing financial outputs", async (_label, sql) => {
  const original = await db.prepare("SELECT id,status,monthly_salary_sen,hourly_rate_sen FROM employees").all();
  const adjustments = await db.prepare("SELECT * FROM payroll_adjustments").all<Record<string, string | number | null>>();
  const wrapped = {
    prepare: db.prepare.bind(db),
    batch: async (statements: D1PreparedStatement[]) => {
      await db.prepare(sql).run();
      return db.batch(statements);
    },
  } as D1Database;
  try {
    expect(await finalise(wrapped)).toHaveProperty("error");
    expect(await db.prepare("SELECT status FROM payroll_runs WHERE id='payroll-2026-08'").first()).toMatchObject({ status: "draft" });
    expect(await db.prepare("SELECT count(*) n FROM payroll_results WHERE payroll_run_id='payroll-2026-08'").first()).toMatchObject({ n: 0 });
    expect(await db.prepare("SELECT count(*) n FROM payslips WHERE payroll_run_id='payroll-2026-08'").first()).toMatchObject({ n: 0 });
  } finally {
    for (const row of original.results) await db.prepare("UPDATE employees SET status=?,monthly_salary_sen=?,hourly_rate_sen=? WHERE id=?").bind(row.status,row.monthly_salary_sen,row.hourly_rate_sen,row.id).run();
    await db.prepare("DELETE FROM payroll_adjustments").run();
    for (const row of adjustments.results) await db.prepare("INSERT INTO payroll_adjustments(id,payroll_run_id,employee_id,type,description,amount_sen,reason,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(row.id,row.payroll_run_id,row.employee_id,row.type,row.description,row.amount_sen,row.reason,row.created_at).run();
  }
});

it("keeps finalised financial snapshots unchanged after employee pay and adjustment edits", async () => {
  expect(await finalise()).toHaveProperty("ok");
  const before = await db.prepare("SELECT * FROM payroll_results WHERE payroll_run_id='payroll-2026-08' ORDER BY id").all();
  const run = await db.prepare("SELECT * FROM payroll_runs WHERE id='payroll-2026-08'").first();
  const salary = await db.prepare("SELECT monthly_salary_sen salary FROM employees WHERE id='emp-001'").first<{salary: number}>();
  const adjustment = await db.prepare("SELECT amount_sen amount FROM payroll_adjustments WHERE id='adj-001'").first<{amount: number}>();
  try {
    await db.batch([
      db.prepare("UPDATE employees SET monthly_salary_sen=monthly_salary_sen+100 WHERE id='emp-001'"),
      db.prepare("UPDATE payroll_adjustments SET amount_sen=amount_sen+100 WHERE id='adj-001'"),
    ]);
    expect(await finalise()).toHaveProperty("ok");
    expect((await db.prepare("SELECT * FROM payroll_results WHERE payroll_run_id='payroll-2026-08' ORDER BY id").all()).results).toEqual(before.results);
    expect(await db.prepare("SELECT * FROM payroll_runs WHERE id='payroll-2026-08'").first()).toEqual(run);
  } finally {
    await db.prepare("UPDATE employees SET monthly_salary_sen=? WHERE id='emp-001'").bind(salary!.salary).run();
    await db.prepare("UPDATE payroll_adjustments SET amount_sen=? WHERE id='adj-001'").bind(adjustment!.amount).run();
  }
});
it.each([
 ['2026-08-99','2026-08-99','full'],['2026-08-18','2026-08-18','invalid'],['2026-08-19','2026-08-18','full'],['2026-07-99','2026-08-18','full'],['2026-07-31','2026-08-03','morning'],
])('rejects malformed persisted unpaid leave %s %s %s',async(start,end,part)=>{
 try {
  await db.prepare("UPDATE leave_requests SET start_date=?,end_date=?,day_part=? WHERE id='lr-003'").bind(start,end,part).run();
  expect(await finalise()).toHaveProperty('error');
  expect(await db.prepare("SELECT count(*) n FROM payroll_results WHERE payroll_run_id='payroll-2026-08'").first()).toMatchObject({n:0});
 }finally{await db.prepare("UPDATE leave_requests SET start_date='2026-08-18',end_date='2026-08-18',day_part='full' WHERE id='lr-003'").run()}
});
it('ignores valid unpaid leave intersection with no working days',async()=>{
 try {
  await db.prepare("UPDATE leave_requests SET start_date='2026-08-01',end_date='2026-08-02',day_part='full' WHERE id='lr-003'").run();
  expect(await finalise()).toHaveProperty('ok');
 }finally{await db.prepare("UPDATE leave_requests SET start_date='2026-08-18',end_date='2026-08-18',day_part='full' WHERE id='lr-003'").run()}
});
it.each([
 ['unpaid leave approval', "UPDATE leave_requests SET status='approved',leave_type_id='leave-unpaid' WHERE id='lr-001'"],
 ['unpaid leave cancellation', "UPDATE leave_requests SET status='cancelled' WHERE id='lr-003'"],
 ['unpaid leave date edit', "UPDATE leave_requests SET start_date='2026-08-19',end_date='2026-08-19' WHERE id='lr-003'"],
 ['unpaid leave day part edit', "UPDATE leave_requests SET day_part='morning' WHERE id='lr-003'"],
 ['leave type paid flag edit', "UPDATE leave_types SET paid=1 WHERE id='leave-unpaid'"],
 ['holiday insertion', "INSERT INTO holidays SELECT 'racing-holiday',company_id,'Race','2026-08-18',category,region,observed,source_url,1,created_at,updated_at FROM holidays WHERE id='holiday-2026-national'"],
 ['holiday archive', "UPDATE holidays SET active=0 WHERE id='holiday-2026-national'"],
 ['holiday date edit', "UPDATE holidays SET date='2026-08-18' WHERE id='holiday-2026-national'"],
])('rejects a racing %s without finalised outputs or audit',async(_label,sql)=>{
 const runBefore=await db.prepare("SELECT * FROM payroll_runs WHERE id='payroll-2026-08'").first();
 const auditsBefore=await db.prepare("SELECT count(*) n FROM audit_events WHERE action='payroll.finalised'").first();
 const notificationsBefore=await db.prepare("SELECT count(*) n FROM notifications").first();
 const wrapped={prepare:db.prepare.bind(db),batch:async(statements:D1PreparedStatement[])=>{
  await db.prepare(sql).run();return db.batch(statements);
 }} as D1Database;
 try {
  expect(await finalise(wrapped)).toHaveProperty('error');
  expect(await db.prepare("SELECT * FROM payroll_runs WHERE id='payroll-2026-08'").first()).toEqual(runBefore);
  expect(await db.prepare("SELECT count(*) n FROM payroll_results WHERE payroll_run_id='payroll-2026-08'").first()).toMatchObject({n:0});
  expect(await db.prepare("SELECT count(*) n FROM payslips WHERE payroll_run_id='payroll-2026-08'").first()).toMatchObject({n:0});
  expect(await db.prepare("SELECT count(*) n FROM audit_events WHERE action='payroll.finalised'").first()).toEqual(auditsBefore);
  expect(await db.prepare("SELECT count(*) n FROM notifications").first()).toEqual(notificationsBefore);
 }finally{
  await db.batch([
   db.prepare("UPDATE leave_requests SET status='pending',leave_type_id='leave-annual' WHERE id='lr-001'"),
   db.prepare("UPDATE leave_requests SET status='approved',start_date='2026-08-18',end_date='2026-08-18',day_part='full' WHERE id='lr-003'"),
   db.prepare("UPDATE leave_types SET paid=0 WHERE id='leave-unpaid'"),
   db.prepare("DELETE FROM holidays WHERE id='racing-holiday'"),
   db.prepare("UPDATE holidays SET active=1,date='2026-08-31' WHERE id='holiday-2026-national'"),
  ]);
 }
});
