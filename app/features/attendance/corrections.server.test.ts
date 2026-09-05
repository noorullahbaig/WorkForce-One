import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testDatabase } from "../../../tests/helpers/database";
import {
  submitCorrection,
  reviewCorrection,
  listCorrections,
} from "./corrections.server";
import type { DemoUser } from "../../services/auth.server";

const employee: DemoUser = {
  id: "user-employee",
  companyId: "company-merdeka",
  employeeId: "emp-001",
  role: "employee",
  name: "Farah",
  email: "employee@workforceone.demo",
};
const admin: DemoUser = {
  ...employee,
  id: "user-admin",
  role: "admin",
  employeeId: null,
};
let fixture: Awaited<ReturnType<typeof testDatabase>>;
let db: D1Database;
const submit = () =>
  submitCorrection(db, employee, {
    attendanceId: "att-001",
    clockIn: "2026-08-26T09:00",
    clockOut: "2026-08-26T18:30",
    reason: "Forgot to scan out",
  });
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
    db.prepare("DELETE FROM notifications WHERE id NOT LIKE 'note-%'"),
    db.prepare("DELETE FROM audit_events WHERE id NOT LIKE 'audit-%'"),
    db.prepare(
      "UPDATE attendance_records SET clock_in='2026-08-26T01:00:00.000Z',clock_in_method='qr',clock_out=NULL, clock_out_method=NULL,worked_minutes=NULL,overtime_minutes=NULL,status='missing_clock_out',updated_at='2026-08-26T01:00:00.000Z' WHERE id='att-001'",
    ),
  ]);
});
describe("correction persistence", () => {
  it("submits without editing attendance and lists only owned requests", async () => {
    expect(await submit()).toHaveProperty("ok");
    expect(
      (
        await db
          .prepare(
            "SELECT clock_out FROM attendance_records WHERE id='att-001'",
          )
          .first()
      )?.clock_out,
    ).toBeNull();
    expect(await listCorrections(db, employee)).toHaveLength(1);
    expect(
      await listCorrections(db, { ...employee, employeeId: "emp-002" }),
    ).toHaveLength(0);
    expect(
      await listCorrections(db, { ...admin, companyId: "another" }),
    ).toHaveLength(0);
  });
  it("prevents concurrent duplicate requests", async () => {
    const results = await Promise.all([submit(), submit()]);
    expect(results.filter((r) => "ok" in r)).toHaveLength(1);
    expect(await listCorrections(db, employee)).toHaveLength(1);
  });
  it("approves once with calculated minutes and one decision event", async () => {
    await submit();
    const [request] = await listCorrections(db, employee);
    const results = await Promise.all([
      reviewCorrection(db, admin, request.id, "approved", ""),
      reviewCorrection(db, admin, request.id, "approved", ""),
    ]);
    expect(results.filter((r) => "ok" in r)).toHaveLength(1);
    expect(
      await db
        .prepare(
          "SELECT clock_out,worked_minutes,overtime_minutes,clock_out_method FROM attendance_records WHERE id='att-001'",
        )
        .first(),
    ).toMatchObject({
      clock_out: "2026-08-26T10:30:00.000Z",
      worked_minutes: 570,
      overtime_minutes: 90,
      clock_out_method: "manual",
    });
    expect(
      (
        await db
          .prepare(
            "SELECT count(*) n FROM audit_events WHERE action='attendance.correction.approved'",
          )
          .first()
      )?.n,
    ).toBe(1);
    expect(
      (
        await db
          .prepare(
            "SELECT count(*) n FROM notifications WHERE user_id='user-employee' AND title='Attendance correction approved'",
          )
          .first()
      )?.n,
    ).toBe(1);
  });
  it("rejects with a required reason without changing attendance", async () => {
    await submit();
    const [request] = await listCorrections(db, employee);
    expect(
      await reviewCorrection(db, admin, request.id, "rejected", ""),
    ).toHaveProperty("error");
    expect(
      await reviewCorrection(
        db,
        admin,
        request.id,
        "rejected",
        "Please check your shift time",
      ),
    ).toHaveProperty("ok");
    expect((await listCorrections(db, employee))[0].rejectionReason).toBe(
      "Please check your shift time",
    );
    expect(
      (
        await db
          .prepare(
            "SELECT clock_out FROM attendance_records WHERE id='att-001'",
          )
          .first()
      )?.clock_out,
    ).toBeNull();
    expect(await submit()).toHaveProperty("ok");
  });
  it("refuses stale approvals and cross-company or employee decisions", async () => {
    await submit();
    const [request] = await listCorrections(db, employee);
    expect(
      await reviewCorrection(db, employee, request.id, "approved", ""),
    ).toHaveProperty("error");
    expect(
      await reviewCorrection(
        db,
        { ...admin, companyId: "other" },
        request.id,
        "approved",
        "",
      ),
    ).toHaveProperty("error");
    await db
      .prepare(
        "UPDATE attendance_records SET clock_out='2026-08-26T09:00:00Z' WHERE id='att-001'",
      )
      .run();
    expect(
      await reviewCorrection(db, admin, request.id, "approved", ""),
    ).toHaveProperty("error");
    expect((await listCorrections(db, employee))[0].status).toBe("pending");
  });
  it("rejects a forged attendance owner", async () => {
    expect(
      await submitCorrection(db, employee, {
        attendanceId: "att-002",
        clockIn: "2026-08-25T09:00",
        clockOut: "2026-08-25T18:30",
        reason: "Reason",
      }),
    ).toHaveProperty("error");
  });
});
it("rolls back attendance, decision and notifications if the audit write fails", async () => {
  await submit();
  const [r] = await listCorrections(db, employee);
  await db
    .prepare(
      "CREATE TRIGGER fail_correction_audit BEFORE INSERT ON audit_events WHEN NEW.action='attendance.correction.approved' BEGIN SELECT RAISE(ABORT,'injected audit failure'); END",
    )
    .run();
  try {
    await expect(
      reviewCorrection(db, admin, r.id, "approved", ""),
    ).rejects.toThrow();
    expect((await listCorrections(db, employee))[0].status).toBe("pending");
    expect(
      (
        await db
          .prepare(
            "SELECT clock_out FROM attendance_records WHERE id='att-001'",
          )
          .first()
      )?.clock_out,
    ).toBeNull();
    expect(
      (
        await db
          .prepare(
            "SELECT count(*) n FROM notifications WHERE title='Attendance correction approved'",
          )
          .first()
      )?.n,
    ).toBe(0);
  } finally {
    await db.prepare("DROP TRIGGER fail_correction_audit").run();
  }
});
it("rejects an overlapping session created after a request was submitted", async () => {
  await submit();
  const [r] = await listCorrections(db, employee);
  await db
    .prepare(
      "INSERT INTO attendance_records(id,employee_id,work_date,clock_in,clock_out,status,created_at,updated_at) VALUES ('overlap','emp-001','2026-08-26','2026-08-26T10:00:00Z','2026-08-26T11:00:00Z','present','now','now')",
    )
    .run();
  try {
    expect(
      await reviewCorrection(db, admin, r.id, "approved", ""),
    ).toMatchObject({ error: expect.stringContaining("overlap") });
  } finally {
    await db.prepare("DELETE FROM attendance_records WHERE id='overlap'").run();
  }
});
it("protects correction-linked attendance from employee reset", async () => {
  const { attendanceClockAction } = await import("./clock.server");
  await submit();
  expect(
    await attendanceClockAction(
      { DB: db } as Env,
      employee,
      "employee-clock",
      { actionType: "reset" },
      "2026-08-26",
      new Date().toISOString(),
    ),
  ).toHaveProperty("error");
  expect(
    await db
      .prepare("SELECT id FROM attendance_records WHERE id='att-001'")
      .first(),
  ).not.toBeNull();
});
it("demo reset restores all corrected records before removing correction history", async () => {
  const { resetDemoData } = await import("../../services/reset.server");
  await submitCorrection(
    db,
    { ...employee, employeeId: "emp-002" },
    {
      attendanceId: "att-002",
      clockIn: "2026-08-25T08:45",
      clockOut: "2026-08-25T19:00",
      reason: "Later finish",
    },
  );
  const [r] = await listCorrections(db, admin);
  await reviewCorrection(db, admin, r.id, "approved", "");
  await resetDemoData(db);
  expect(
    (
      await db
        .prepare("SELECT clock_out FROM attendance_records WHERE id='att-002'")
        .first()
    )?.clock_out,
  ).toBe("2026-08-25T10:15:00.000Z");
});
it.each(["employee-clock", "simulate-attendance"])(
  "does not let an in-flight %s overwrite an approved correction",
  async (intent) => {
    const { attendanceClockAction } = await import("./clock.server");
    await submit();
    const [r] = await listCorrections(db, employee);
    const wrapped = {
      prepare: (sql: string) => {
        const statement = db.prepare(sql);
        if (!sql.startsWith("UPDATE attendance_records SET clock_out="))
          return statement;
        return {
          bind: (...values: unknown[]) => {
            const bound = statement.bind(...values);
            return {
              run: async () => {
                await reviewCorrection(db, admin, r.id, "approved", "");
                return bound.run();
              },
            };
          },
        };
      },
    } as D1Database;
    expect(
      await attendanceClockAction(
        { DB: wrapped } as Env,
        intent === "employee-clock" ? employee : admin,
        intent,
        { actionType: "clock-out", employeeId: "emp-001" },
        "2026-08-26",
        "2026-08-26T11:00:00.000Z",
      ),
    ).toHaveProperty("error");
    expect(
      (
        await db
          .prepare(
            "SELECT clock_out FROM attendance_records WHERE id='att-001'",
          )
          .first()
      )?.clock_out,
    ).toBe("2026-08-26T10:30:00.000Z");
  },
);
it("corrects an existing absent record and preserves a pre-existing late flag", async () => {
  await db
    .prepare(
      "UPDATE attendance_records SET status='absent',clock_in=NULL,clock_in_method=NULL WHERE id='att-001'",
    )
    .run();
  expect(await submit()).toHaveProperty("ok");
  let [r] = await listCorrections(db, employee);
  expect(
    await reviewCorrection(db, admin, r.id, "approved", ""),
  ).toHaveProperty("ok");
  expect(
    await db
      .prepare(
        "SELECT status,clock_in_method FROM attendance_records WHERE id='att-001'",
      )
      .first(),
  ).toMatchObject({ status: "present", clock_in_method: "manual" });
  await db
    .prepare("UPDATE attendance_records SET status='late' WHERE id='att-001'")
    .run();
  await submitCorrection(db, employee, {
    attendanceId: "att-001",
    clockIn: "2026-08-26T09:00",
    clockOut: "2026-08-26T19:00",
    reason: "Later departure",
  });
  r = (await listCorrections(db, employee)).find(
    (r) => r.status === "pending",
  )!;
  await reviewCorrection(db, admin, r.id, "approved", "");
  expect(
    (
      await db
        .prepare("SELECT status FROM attendance_records WHERE id='att-001'")
        .first()
    )?.status,
  ).toBe("late");
});
