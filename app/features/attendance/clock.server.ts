import {
  calculateAttendance,
  NORMAL_DAY_MINUTES,
} from "../../domain/attendance";
import { time } from "../../lib/format";
import type { DemoUser } from "../../services/auth.server";
export async function attendanceClockAction(
  env: Env,
  user: DemoUser,
  intent: string,
  data: Record<string, FormDataEntryValue>,
  today: string,
  now: string,
) {
  if (
    intent === "employee-clock" &&
    user.role === "employee" &&
    user.employeeId
  ) {
    const owned = await env.DB.prepare(
      "SELECT id FROM employees WHERE id=? AND company_id=?",
    )
      .bind(user.employeeId, user.companyId)
      .first();
    if (!owned) return { error: "Employee not found." };
    const todayDate = today;
    const actionType = String(data.actionType ?? "");
    if (!["clock-in", "clock-out", "reset"].includes(actionType))
      return { error: "Choose a valid clock action." };
    const method = data.method === "qr" ? "qr" : "fingerprint";

    if (actionType === "reset") {
      const deleted = await env.DB.prepare(
        "DELETE FROM attendance_records WHERE employee_id=? AND work_date=? AND NOT EXISTS (SELECT 1 FROM attendance_correction_requests c WHERE c.employee_id=? AND c.work_date=?)",
      )
        .bind(user.employeeId, todayDate, user.employeeId, todayDate)
        .run();
      if (!deleted.meta.changes)
        return {
          error:
            "Cannot reset attendance linked to correction requests, or there are no records to reset.",
        };
      return { ok: "Today's shift records reset. Ready to clock in." };
    }

    const openShift = await env.DB.prepare(
      "SELECT id, clock_in clockIn, clock_out clockOut, status FROM attendance_records WHERE employee_id=? AND work_date=? AND status='missing_clock_out' ORDER BY clock_in DESC LIMIT 1",
    )
      .bind(user.employeeId, todayDate)
      .first<{
        id: string;
        clockIn: string | null;
        clockOut: string | null;
        status: string;
      }>();

    if (actionType === "clock-out" && openShift?.clockIn) {
      const clockOutTime = now;
      const res = calculateAttendance({
        clockIn: openShift.clockIn,
        clockOut: clockOutTime,
        normalDayMinutes: NORMAL_DAY_MINUTES,
      });
      const updated = await env.DB.prepare(
        "UPDATE attendance_records SET clock_out=?, clock_out_method=?, worked_minutes=?, overtime_minutes=?, status='present', updated_at=? WHERE id=? AND clock_out IS NULL AND clock_in=? AND status='missing_clock_out'",
      )
        .bind(
          clockOutTime,
          method,
          res.workedMinutes,
          res.overtimeMinutes,
          now,
          openShift.id,
          openShift.clockIn,
        )
        .run();
      if (!updated.meta.changes)
        return {
          error:
            "Attendance changed while clocking out. Refresh and check the record.",
        };
      return {
        ok: `Clocked out successfully via ${method === "fingerprint" ? "Fingerprint" : "QR Code"} · ${(res.workedMinutes! / 60).toFixed(1)} hours worked.`,
      };
    }

    if (actionType === "clock-out")
      return { error: "No open shift found. Refresh and check the record." };
    if (actionType === "clock-in") {
      const recordId = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO attendance_records (id, employee_id, work_date, clock_in, clock_in_method, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'missing_clock_out', ?, ?)",
      )
        .bind(recordId, user.employeeId, todayDate, now, method, now, now)
        .run();
      return {
        ok: `Clocked in successfully via ${method === "fingerprint" ? "Fingerprint" : "QR Code"} at ${time(now)}.`,
      };
    }

    return { ok: "Attendance shift updated." };
  }
  if (intent === "simulate-attendance" && user.role === "admin") {
    const employeeId = String(data.employeeId);
    const method = data.method === "fingerprint" ? "fingerprint" : "qr";
    const employee = await env.DB.prepare(
      "SELECT id FROM employees WHERE id=? AND company_id=?",
    )
      .bind(employeeId, user.companyId)
      .first();
    if (!employee) return { error: "Employee not found." };
    const existing = await env.DB.prepare(
      "SELECT id,work_date workDate,clock_in clockIn FROM attendance_records WHERE employee_id=? AND status='missing_clock_out' ORDER BY work_date ASC LIMIT 1",
    )
      .bind(employeeId)
      .first<{ id: string; workDate: string; clockIn: string | null }>();
    if (existing?.clockIn) {
      const clockOut = `${existing.workDate}T10:15:00.000Z`;
      const result = calculateAttendance({
        clockIn: existing.clockIn,
        clockOut,
        normalDayMinutes: NORMAL_DAY_MINUTES,
      });
      const updated = await env.DB.prepare(
        "UPDATE attendance_records SET clock_out=?,clock_out_method=?,worked_minutes=?,overtime_minutes=?,status='present',updated_at=? WHERE id=? AND clock_out IS NULL AND clock_in=? AND status='missing_clock_out'",
      )
        .bind(
          clockOut,
          method,
          result.workedMinutes,
          result.overtimeMinutes,
          now,
          existing.id,
          existing.clockIn,
        )
        .run();
      if (!updated.meta.changes)
        return {
          error:
            "Attendance changed while clocking out. Refresh and check the record.",
        };
      return {
        ok: `Clock-out captured · ${result.workedMinutes! / 60} hours worked.`,
      };
    }
    await env.DB.prepare(
      "INSERT INTO attendance_records (id,employee_id,work_date,clock_in,clock_in_method,status,created_at,updated_at) VALUES (?,?,?, ?,?,'missing_clock_out',?,?)",
    )
      .bind(
        crypto.randomUUID(),
        employeeId,
        today,
        `${today}T01:00:00.000Z`,
        method,
        now,
        now,
      )
      .run();
    return { ok: "Clock-in captured at 9:00 AM MYT." };
  }
  return { error: "Attendance action unavailable." };
}
