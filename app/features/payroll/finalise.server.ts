import { calculatePayroll, type PayrollBreakdown } from "../../domain/payroll";
import {
  calculateLeaveDurationHalfDays,
  type LeaveDayPart,
} from "../../domain/leave";
import { NORMAL_DAY_MINUTES } from "../../domain/attendance";
import type { DemoUser } from "../../services/auth.server";
import { aggregateAttendance } from "./attendance-inputs";
import {
  attendanceSnapshotSql,
  payrollAttendance,
} from "./attendance-inputs.server";

type PayEmployee = {
  id: string;
  fullName: string;
  salaryType: "monthly" | "hourly";
  monthlySalarySen: number | null;
  hourlyRateSen: number | null;
};
export async function finalisePayroll(id: string, user: DemoUser, env: Env) {
  const db = env.DB;
  if (user.role !== "admin")
    return { error: "Only admins can finalise payroll." };
  const run = await db
    .prepare(
      "SELECT id,status,period,period_start periodStart,period_end periodEnd,policy_id policyId FROM payroll_runs WHERE id=? AND company_id=?",
    )
    .bind(id, user.companyId)
    .first<{
      id: string;
      status: string;
      period: string;
      periodStart: string;
      periodEnd: string;
      policyId: string;
    }>();
  if (!run) return { error: "Payroll run not found." };
  if (run.status === "finalised")
    return { ok: "Payroll was already finalised safely." };
  const source = await payrollAttendance(
    db,
    user.companyId,
    run.periodStart,
    run.periodEnd,
  );
  if (source.records.some((r) => r.status === "missing_clock_out"))
    return {
      error:
        "Resolve missing clock-outs in this payroll period before finalising.",
    };
  const pending = await db
    .prepare(
      "SELECT id FROM attendance_correction_requests WHERE company_id=? AND status='pending' AND work_date>=? AND work_date<=? LIMIT 1",
    )
    .bind(user.companyId, run.periodStart, run.periodEnd)
    .first();
  if (pending)
    return {
      error:
        "Review pending attendance corrections in this payroll period before finalising.",
    };
  const [employeeRows, adjustmentRows, holidayRows, leaveRows] =
    await Promise.all([
      db
        .prepare(
          "SELECT id,full_name fullName,salary_type salaryType,monthly_salary_sen monthlySalarySen,hourly_rate_sen hourlyRateSen FROM employees WHERE company_id=? AND status!='inactive'",
        )
        .bind(user.companyId)
        .all<PayEmployee>(),
      db
        .prepare(
          "SELECT a.employee_id employeeId,a.type,a.amount_sen amountSen FROM payroll_adjustments a JOIN employees e ON e.id=a.employee_id WHERE a.payroll_run_id=? AND e.company_id=?",
        )
        .bind(id, user.companyId)
        .all<{ employeeId: string; type: string; amountSen: number }>(),
      db
        .prepare(
          "SELECT date FROM holidays WHERE company_id=? AND active=1 AND date>=? AND date<=?",
        )
        .bind(user.companyId, run.periodStart, run.periodEnd)
        .all<{ date: string }>(),
      db
        .prepare(
          "SELECT l.employee_id employeeId,l.start_date startDate,l.end_date endDate,l.day_part dayPart FROM leave_requests l JOIN leave_types t ON t.id=l.leave_type_id JOIN employees e ON e.id=l.employee_id WHERE e.company_id=? AND l.status='approved' AND t.paid=0 AND l.start_date<=? AND l.end_date>=?",
        )
        .bind(user.companyId, run.periodEnd, run.periodStart)
        .all<{
          employeeId: string;
          startDate: string;
          endDate: string;
          dayPart: LeaveDayPart;
        }>(),
    ]);
  const unpaidDays = new Map<string, number>();
  for (const leave of leaveRows.results) {
    try {
      const duration = calculateLeaveDurationHalfDays({
        startDate:
          leave.startDate < run.periodStart ? run.periodStart : leave.startDate,
        endDate: leave.endDate > run.periodEnd ? run.periodEnd : leave.endDate,
        dayPart: leave.dayPart,
        holidayDates: holidayRows.results.map((h) => h.date),
      });
      unpaidDays.set(
        leave.employeeId,
        (unpaidDays.get(leave.employeeId) ?? 0) + duration.durationHalfDays / 2,
      );
    } catch {
      /* Existing leave calculation excludes empty working-day intersections. */
    }
  }
  const totals = aggregateAttendance(
    source.records,
    run.periodStart,
    run.periodEnd,
  );
  const timestamp = new Date().toISOString(),
    eventId = crypto.randomUUID();
  const writes: D1PreparedStatement[] = [];
  let gross = 0,
    deductions = 0,
    net = 0,
    employer = 0;
  for (const employee of employeeRows.results) {
    const attendance = totals.find((r) => r.employeeId === employee.id);
    const sum = (type: string) =>
      adjustmentRows.results
        .filter((a) => a.employeeId === employee.id && a.type === type)
        .reduce((n, a) => n + a.amountSen, 0);
    const input = {
      salaryType: employee.salaryType,
      monthlySalarySen: employee.monthlySalarySen,
      hourlyRateSen: employee.hourlyRateSen,
      regularMinutes: attendance?.regularMinutes ?? 0,
      overtimeMinutes: attendance?.overtimeMinutes ?? 0,
      unpaidLeaveDays: unpaidDays.get(employee.id) ?? 0,
      wagePeriodDays: 31,
      allowanceSen: sum("allowance"),
      bonusSen: sum("bonus"),
      otherDeductionSen: sum("deduction"),
      pcbSen: sum("pcb"),
      overtimeMultiplier: 1.5,
      normalDayMinutes: NORMAL_DAY_MINUTES,
    };
    let breakdown: PayrollBreakdown;
    try {
      breakdown = calculatePayroll(input);
    } catch {
      return { error: `${employee.fullName} has an incomplete pay profile.` };
    }
    gross += breakdown.grossPaySen;
    deductions += breakdown.totalDeductionsSen;
    net += breakdown.netPaySen;
    employer += breakdown.totalEmployerContributionsSen;
    const resultId = `result-${run.period}-${employee.id}`,
      payslipId = `payslip-${run.period}-${employee.id}`;
    writes.push(
      db
        .prepare(
          `INSERT INTO payroll_results (id,payroll_run_id,employee_id,input_snapshot_json,breakdown_json,gross_pay_sen,total_deductions_sen,net_pay_sen,employer_contributions_sen,created_at)
  SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM audit_events WHERE id=?)`,
        )
        .bind(
          resultId,
          id,
          employee.id,
          JSON.stringify({ ...input, policyId: run.policyId }),
          JSON.stringify(breakdown),
          breakdown.grossPaySen,
          breakdown.totalDeductionsSen,
          breakdown.netPaySen,
          breakdown.totalEmployerContributionsSen,
          timestamp,
          eventId,
        ),
    );
    writes.push(
      db
        .prepare(
          "INSERT INTO payslips(id,payroll_result_id,payroll_run_id,employee_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM audit_events WHERE id=?)",
        )
        .bind(payslipId, resultId, id, employee.id, timestamp, eventId),
    );
    const month = new Intl.DateTimeFormat("en-MY", {
      month: "long",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date(`${run.periodStart}T00:00:00+08:00`));
    writes.push(
      db
        .prepare(
          `INSERT INTO notifications(id,user_id,title,body,href,created_at) SELECT lower(hex(randomblob(16))),u.id,?,?,?,? FROM users u WHERE u.employee_id=? AND u.company_id=? AND u.active=1 AND EXISTS (SELECT 1 FROM audit_events WHERE id=?)`,
        )
        .bind(
          `${month} payslip is ready`,
          `Your ${month} ${run.period.slice(0, 4)} payslip is available.`,
          `/employee/payslips/${payslipId}`,
          timestamp,
          employee.id,
          user.companyId,
          eventId,
        ),
    );
  }
  // D1 batches are atomic. Every output is gated by this successful state transition's audit ID.
  const results = await db.batch([
    db
      .prepare(
        `UPDATE payroll_runs SET status='finalised',gross_total_sen=?,deduction_total_sen=?,net_total_sen=?,employer_contribution_total_sen=?,idempotency_key=?,finalised_at=?,updated_at=?
   WHERE id=? AND company_id=? AND status='draft'
   AND NOT EXISTS (SELECT 1 FROM attendance_correction_requests WHERE company_id=? AND status='pending' AND work_date>=? AND work_date<=?)
   AND (${attendanceSnapshotSql})=?`,
      )
      .bind(
        gross,
        deductions,
        net,
        employer,
        `finalise-${user.companyId}-${run.period}`,
        timestamp,
        timestamp,
        id,
        user.companyId,
        user.companyId,
        run.periodStart,
        run.periodEnd,
        user.companyId,
        run.periodStart,
        run.periodEnd,
        source.snapshot,
      ),
    db
      .prepare(
        `INSERT INTO audit_events(id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at)
   SELECT ?,?,?,'payroll.finalised','payroll_run',?,?,? WHERE changes()=1`,
      )
      .bind(
        eventId,
        user.companyId,
        user.id,
        id,
        JSON.stringify({ period: run.period, policyId: run.policyId }),
        timestamp,
      ),
    ...writes,
  ]);
  return results[0].meta.changes
    ? { ok: "Payroll finalised. Snapshots and payslips are now immutable." }
    : {
        error:
          "Payroll or attendance changed during finalisation. Refresh and review the latest inputs and pending corrections.",
      };
}
