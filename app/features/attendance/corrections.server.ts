import type { DemoUser } from "../../services/auth.server";
import { toUtc, validateCorrection } from "./corrections";
import type { Attendance, CorrectionRequest, CorrectionResult } from "./types";

const originalMatch = `a.employee_id=c.employee_id AND a.work_date=c.work_date
 AND a.clock_in IS c.original_clock_in AND a.clock_out IS c.original_clock_out
 AND a.clock_in_method IS c.original_clock_in_method AND a.clock_out_method IS c.original_clock_out_method
 AND a.status=c.original_status AND a.worked_minutes IS c.original_worked_minutes
 AND a.overtime_minutes IS c.original_overtime_minutes AND a.updated_at=c.original_updated_at`;
const sourceColumns = `a.id,a.employee_id employeeId,a.work_date workDate,a.clock_in clockIn,a.clock_out clockOut,
 a.clock_in_method clockInMethod,a.clock_out_method clockOutMethod,a.status,a.worked_minutes workedMinutes,a.overtime_minutes overtimeMinutes,a.updated_at updatedAt`;
export async function listCorrections(
  db: D1Database,
  user: DemoUser,
): Promise<CorrectionRequest[]> {
  if (user.role === "employee" && !user.employeeId) return [];
  return (
    await db
      .prepare(
        `SELECT c.id,c.company_id companyId,c.employee_id employeeId,c.attendance_id attendanceId,c.requested_by requestedBy,
 e.full_name fullName,e.employee_code employeeCode,e.salary_type salaryType,c.work_date workDate,
 c.original_clock_in originalClockIn,c.original_clock_out originalClockOut,c.original_clock_in_method originalClockInMethod,c.original_clock_out_method originalClockOutMethod,
 c.original_status originalStatus,c.original_worked_minutes originalWorkedMinutes,c.original_overtime_minutes originalOvertimeMinutes,c.original_updated_at originalUpdatedAt,
 c.proposed_clock_in proposedClockIn,c.proposed_clock_out proposedClockOut,c.reason,c.status,c.reviewed_by reviewedBy,c.reviewed_at reviewedAt,c.rejection_reason rejectionReason,c.created_at createdAt,
 NOT (${originalMatch}) stale,a.clock_in currentClockIn,a.clock_out currentClockOut
 FROM attendance_correction_requests c JOIN employees e ON e.id=c.employee_id AND e.company_id=c.company_id
 JOIN attendance_records a ON a.id=c.attendance_id
 WHERE c.company_id=? ${user.role === "employee" ? "AND c.employee_id=?" : ""} ORDER BY c.created_at DESC,c.id`,
      )
      .bind(
        ...(user.role === "employee"
          ? [user.companyId, user.employeeId]
          : [user.companyId]),
      )
      .all<CorrectionRequest>()
  ).results;
}
async function source(db: D1Database, user: DemoUser, id: string) {
  return db
    .prepare(
      `SELECT ${sourceColumns} FROM attendance_records a JOIN employees e ON e.id=a.employee_id WHERE a.id=? AND e.company_id=? ${user.role === "employee" ? "AND e.id=?" : ""}`,
    )
    .bind(
      ...(user.role === "employee"
        ? [id, user.companyId, user.employeeId]
        : [id, user.companyId]),
    )
    .first<Attendance>();
}
async function sessions(db: D1Database, employeeId: string) {
  return (
    await db
      .prepare(
        "SELECT id,clock_in clockIn,clock_out clockOut FROM attendance_records WHERE employee_id=?",
      )
      .bind(employeeId)
      .all<Attendance>()
  ).results;
}
// Repeated in the guarded write so a session created after validation cannot be overwritten.
const noOverlap = `NOT EXISTS (SELECT 1 FROM attendance_records s WHERE s.employee_id=? AND s.id!=? AND s.clock_in IS NOT NULL AND julianday(s.clock_in)<julianday(?) AND (s.clock_out IS NULL OR julianday(s.clock_out)>julianday(?)))`;
function audit(
  db: D1Database,
  id: string,
  user: DemoUser,
  action: string,
  requestId: string,
  metadata: unknown,
  now: string,
) {
  // Must immediately follow the conditional INSERT/UPDATE in the same batch.
  return db
    .prepare(
      `INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at)
 SELECT ?,?,?,?,'attendance_correction_request',?,?,? WHERE changes()=1`,
    )
    .bind(
      id,
      user.companyId,
      user.id,
      action,
      requestId,
      JSON.stringify(metadata),
      now,
    );
}
function notification(
  db: D1Database,
  eventId: string,
  user: DemoUser,
  title: string,
  body: string,
  href: string,
  now: string,
  requesterId?: string,
) {
  return db
    .prepare(
      `INSERT INTO notifications (id,user_id,title,body,href,created_at)
 SELECT lower(hex(randomblob(16))),u.id,?,?,?,? FROM users u WHERE u.company_id=? AND u.active=1
 AND ${requesterId ? "u.id=?" : "u.role='admin'"} AND EXISTS (SELECT 1 FROM audit_events WHERE id=?)`,
    )
    .bind(
      ...[
        title,
        body,
        href,
        now,
        user.companyId,
        ...(requesterId ? [requesterId] : []),
        eventId,
      ],
    );
}
export async function submitCorrection(
  db: D1Database,
  user: DemoUser,
  input: {
    attendanceId: string;
    clockIn: string;
    clockOut: string;
    reason: string;
  },
): Promise<CorrectionResult> {
  if (user.role !== "employee" || !user.employeeId)
    return {
      error: "Only employees can request their own attendance corrections.",
    };
  const record = await source(db, user, input.attendanceId);
  if (!record) return { error: "Attendance record not found." };
  let clockIn: string, clockOut: string;
  try {
    clockIn = toUtc(input.clockIn, record.clockIn);
    clockOut = toUtc(input.clockOut, record.clockOut);
    validateCorrection(
      record,
      clockIn,
      clockOut,
      input.reason,
      await sessions(db, record.employeeId),
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid correction.",
    };
  }
  const id = crypto.randomUUID(),
    eventId = crypto.randomUUID(),
    now = new Date().toISOString();
  try {
    const results = await db.batch([
      db
        .prepare(
          `INSERT INTO attendance_correction_requests
   (id,company_id,employee_id,attendance_id,requested_by,work_date,original_clock_in,original_clock_out,original_clock_in_method,original_clock_out_method,original_status,original_worked_minutes,original_overtime_minutes,original_updated_at,proposed_clock_in,proposed_clock_out,reason,status,created_at,updated_at)
   SELECT ?,?,a.employee_id,a.id,?,a.work_date,a.clock_in,a.clock_out,a.clock_in_method,a.clock_out_method,a.status,a.worked_minutes,a.overtime_minutes,a.updated_at,?,?,?,'pending',?,?
   FROM attendance_records a JOIN employees e ON e.id=a.employee_id WHERE a.id=? AND e.company_id=? AND e.id=?
   AND a.updated_at=? AND a.clock_in IS ? AND a.clock_out IS ? AND a.status=? AND ${noOverlap}`,
        )
        .bind(
          id,
          user.companyId,
          user.id,
          clockIn,
          clockOut,
          input.reason.trim(),
          now,
          now,
          record.id,
          user.companyId,
          user.employeeId,
          record.updatedAt,
          record.clockIn,
          record.clockOut,
          record.status,
          record.employeeId,
          record.id,
          clockOut,
          clockIn,
        ),
      audit(
        db,
        eventId,
        user,
        "attendance.correction.submitted",
        id,
        {
          attendanceId: record.id,
          original: record,
          proposed: { clockIn, clockOut },
          reason: input.reason.trim(),
        },
        now,
      ),
      notification(
        db,
        eventId,
        user,
        "Attendance correction needs review",
        `${user.name} requested a correction for ${record.workDate}.`,
        `/admin/attendance/corrections?request=${id}`,
        now,
      ),
    ]);
    return results[0].meta.changes
      ? {
          ok: "Correction requested. Attendance will change only after approval.",
        }
      : {
          error:
            "Attendance changed or overlaps another session. Refresh and try again.",
        };
  } catch (error) {
    if (
      String(error).includes(
        "UNIQUE constraint failed: attendance_correction_requests.attendance_id",
      )
    )
      return { error: "A pending correction already exists for this record." };
    throw error;
  }
}
export async function reviewCorrection(
  db: D1Database,
  user: DemoUser,
  id: string,
  decision: string,
  note: string,
): Promise<CorrectionResult> {
  if (user.role !== "admin")
    return { error: "Only admins can review attendance corrections." };
  if (decision !== "approved" && decision !== "rejected")
    return { error: "Choose approve or reject." };
  if (decision === "rejected" && (!note.trim() || note.trim().length > 2000))
    return { error: "Enter a rejection reason of 1–2000 characters." };
  const request = (await listCorrections(db, user)).find((r) => r.id === id);
  if (!request || request.status !== "pending")
    return { error: "Pending correction not found or already reviewed." };
  const record = await source(db, user, request.attendanceId);
  if (!record) return { error: "Attendance record not found." };
  let calculation:
    | { workedMinutes: number | null; overtimeMinutes: number | null }
    | undefined;
  if (decision === "approved") {
    if (request.stale)
      return {
        error:
          "Attendance has changed since submission. Reject this request and ask the employee to submit current values.",
      };
    try {
      calculation = validateCorrection(
        record,
        request.proposedClockIn,
        request.proposedClockOut,
        request.reason,
        await sessions(db, record.employeeId),
      );
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Invalid correction.",
      };
    }
  }
  const now = new Date().toISOString(),
    eventId = crypto.randomUUID();
  const status = record.status === "late" ? "late" : "present";
  const applied = calculation
    ? {
        clockIn: request.proposedClockIn,
        clockOut: request.proposedClockOut,
        ...calculation,
        status,
      }
    : null;
  const statements = [
    db
      .prepare(
        `UPDATE attendance_correction_requests AS c SET status=?,reviewed_by=?,reviewed_at=?,rejection_reason=?,updated_at=?
  WHERE c.id=? AND c.company_id=? AND c.status='pending'
  AND EXISTS (SELECT 1 FROM employees e WHERE e.id=c.employee_id AND e.company_id=?)
  ${decision === "approved" ? `AND EXISTS (SELECT 1 FROM attendance_records a WHERE a.id=c.attendance_id AND ${originalMatch}) AND ${noOverlap}` : ""}`,
      )
      .bind(
        ...[
          decision,
          user.id,
          now,
          decision === "rejected" ? note.trim() : null,
          now,
          id,
          user.companyId,
          user.companyId,
          ...(decision === "approved"
            ? [
                record.employeeId,
                record.id,
                request.proposedClockOut,
                request.proposedClockIn,
              ]
            : []),
        ],
      ),
    audit(
      db,
      eventId,
      user,
      `attendance.correction.${decision}`,
      id,
      {
        attendanceId: record.id,
        original: record,
        applied,
        rejectionReason: decision === "rejected" ? note.trim() : null,
      },
      now,
    ),
  ];
  if (calculation)
    statements.push(
      db
        .prepare(
          `UPDATE attendance_records SET clock_in=?,clock_out=?,
 clock_in_method=CASE WHEN clock_in IS ? THEN clock_in_method ELSE 'manual' END,
 clock_out_method=CASE WHEN clock_out IS ? THEN clock_out_method ELSE 'manual' END,
 worked_minutes=?,overtime_minutes=?,status=?,updated_at=? WHERE id=? AND EXISTS (SELECT 1 FROM audit_events WHERE id=?)`,
        )
        .bind(
          request.proposedClockIn,
          request.proposedClockOut,
          request.proposedClockIn,
          request.proposedClockOut,
          calculation.workedMinutes,
          calculation.overtimeMinutes,
          status,
          now,
          record.id,
          eventId,
        ),
    );
  statements.push(
    notification(
      db,
      eventId,
      user,
      `Attendance correction ${decision}`,
      decision === "approved"
        ? `Your attendance for ${record.workDate} has been corrected.`
        : `Your correction for ${record.workDate} was rejected: ${note.trim()}`,
      `/employee/attendance?request=${id}`,
      now,
      request.requestedBy,
    ),
  );
  // Capture payroll context inside the same transaction as the decision.
  statements.push(
    db
      .prepare(
        `UPDATE audit_events SET metadata_json=json_set(metadata_json,'$.payrollPeriods',json((SELECT json_group_array(json_object('id',id,'status',status,'period',period)) FROM payroll_runs WHERE company_id=? AND period_start<=? AND period_end>=?))) WHERE id=?`,
      )
      .bind(user.companyId, record.workDate, record.workDate, eventId),
  );
  const results = await db.batch(statements);
  if (!results[0].meta.changes)
    return {
      error:
        "The request or attendance changed while reviewing. Refresh before reviewing again.",
    };
  const finalised = await db
    .prepare(
      "SELECT id FROM payroll_runs WHERE company_id=? AND status='finalised' AND period_start<=? AND period_end>=? LIMIT 1",
    )
    .bind(user.companyId, record.workDate, record.workDate)
    .first();
  return {
    ok: `Attendance correction ${decision}.${decision === "approved" && finalised ? " This date belongs to finalised payroll; payroll and payslips remain unchanged." : ""}`,
  };
}
