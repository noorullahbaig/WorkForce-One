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
