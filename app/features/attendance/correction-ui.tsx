import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  Status,
  Empty,
  TaskWorkspace,
  WorkspaceHeader,
} from "../../components/portal-ui";
import { date } from "../../lib/format";
import {
  calculateAttendance,
  NORMAL_DAY_MINUTES,
} from "../../domain/attendance";
import { malaysiaInput, toUtc, validateCorrection } from "./corrections";
import type {
  Attendance,
  CorrectionRequest,
  PayrollPeriod,
  CorrectionResult,
} from "./types";
import "./attendance.css";

export const duration = (minutes: number | null) =>
  minutes === null
    ? "Incomplete"
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const timestamp = (value: string | null) =>
  value
    ? date(value, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Not recorded";
function Comparison({
  originalIn,
  originalOut,
  proposedIn,
  proposedOut,
}: {
  originalIn: string | null;
  originalOut: string | null;
  proposedIn: string | null;
  proposedOut: string | null;
}) {
  return (
    <div className="correction-comparison">
      <section>
        <h3>Original record</h3>
        <dl>
          <dt>Clock in</dt>
          <dd>{timestamp(originalIn)}</dd>
          <dt>Clock out</dt>
          <dd>{timestamp(originalOut)}</dd>
        </dl>
      </section>
      <section>
        <h3>Proposed correction</h3>
        <dl>
          <dt>Clock in</dt>
          <dd>{timestamp(proposedIn)}</dd>
          <dt>Clock out</dt>
          <dd>{timestamp(proposedOut)}</dd>
        </dl>
      </section>
    </div>
  );
}
export function CorrectionForm({
  record,
  records,
}: {
  record: Attendance;
  records: Attendance[];
}) {
  const [clockIn, setClockIn] = useState(malaysiaInput(record.clockIn));
  const [clockOut, setClockOut] = useState(malaysiaInput(record.clockOut));
  const [reason, setReason] = useState("");
  const navigation = useNavigation();
  let preview: ReturnType<typeof calculateAttendance> | undefined,
    validation = "";
  try {
    preview = validateCorrection(
      record,
      toUtc(clockIn, record.clockIn),
      toUtc(clockOut, record.clockOut),
      reason || "Preview",
      records,
    );
  } catch (error) {
    validation =
      error instanceof Error ? error.message : "Check the proposed times.";
  }
  const action = useActionData<CorrectionResult>();
  return (
    <section
      className="correction-panel surface"
      aria-labelledby="correction-form-title"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">Attendance · {date(record.workDate)}</p>
          <h2 id="correction-form-title">Request a correction</h2>
        </div>
        <Link className="text-button" to="/employee/attendance">
          Cancel
        </Link>
      </div>
      <section className="correction-original">
        <h3>Original record</h3>
        <p>
          Clock in: {timestamp(record.clockIn)}
          <br />
          Clock out: {timestamp(record.clockOut)}
        </p>
        <small>
          {duration(record.workedMinutes)} · {duration(record.overtimeMinutes)}{" "}
          overtime
        </small>
      </section>
      <Form method="post" className="correction-form">
        <input
          type="hidden"
          name="intent"
          value="request-attendance-correction"
        />
        <input type="hidden" name="attendanceId" value={record.id} />
        <div className="correction-fields">
          <label>
            Proposed clock in (Malaysia time)
            <input
              type="datetime-local"
              step="1"
              required
              name="clockIn"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
            />
          </label>
          <label>
            Proposed clock out (Malaysia time)
            <input
              type="datetime-local"
              step="1"
              required
              name="clockOut"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label htmlFor="correction-reason">Reason for correction</label>
          <textarea
            id="correction-reason"
            required
            maxLength={2000}
            name="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what happened and which times are correct."
          />
        </div>
        <div className="correction-preview" aria-live="polite">
          {preview ? (
            <>
              <strong>
                {duration(preview.workedMinutes)} worked ·{" "}
                {duration(preview.overtimeMinutes)} overtime
              </strong>
              <p>
                Calculated from your proposed times using the current attendance
                rules.
              </p>
            </>
          ) : (
            <p>
              {clockIn && clockOut
                ? validation
                : "Enter both times to preview worked time and overtime."}
            </p>
          )}
        </div>
        {action && "error" in action && (
          <p role="alert" className="correction-error">
            {action.error}
          </p>
        )}
        <p className="correction-hint">
          Your original attendance stays unchanged until an admin approves this
          request.
        </p>
        <button
          className="button primary"
          disabled={!preview || !reason.trim() || navigation.state !== "idle"}
        >
          {navigation.state !== "idle"
            ? "Submitting…"
            : "Submit correction request"}
        </button>
      </Form>
    </section>
  );
}
function RequestSummary({ request }: { request: CorrectionRequest }) {
  return (
    <details className="correction-request-history">
      <summary>
        <Status value={request.status} />
        <span>Requested {date(request.createdAt)}</span>
      </summary>
      <Comparison
        originalIn={request.originalClockIn}
        originalOut={request.originalClockOut}
        proposedIn={request.proposedClockIn}
        proposedOut={request.proposedClockOut}
      />
      <p className="correction-reason">
        <strong>Reason:</strong> {request.reason}
      </p>
      {request.rejectionReason && (
        <p className="correction-error">
          <strong>Rejection reason:</strong> {request.rejectionReason}
        </p>
      )}
      {request.reviewedAt && <p>Reviewed {date(request.reviewedAt)}</p>}
    </details>
  );
}
export function EmployeeCorrectionHistory({
  records,
  corrections,
}: {
  records: Attendance[];
  corrections: CorrectionRequest[];
}) {
  const [params] = useSearchParams();
  const selected = records.find((r) => r.id === params.get("correct"));
  const requested = corrections.find((c) => c.id === params.get("request"));
  const canCorrect =
    selected &&
    selected.status !== "on_leave" &&
    !corrections.some(
      (c) => c.attendanceId === selected.id && c.status === "pending",
    );
  return (
    <>
      {canCorrect && (
        <CorrectionForm key={selected.id} record={selected} records={records} />
      )}
      {requested && (
        <section className="surface correction-panel">
          <h2>Correction for {date(requested.workDate)}</h2>
          <RequestSummary request={requested} />
        </section>
      )}
      <section className="surface history">
        <div className="section-head">
          <h2>Activity history</h2>
          <span>Malaysia time</span>
        </div>
        {records.map((r) => {
          const requests = corrections.filter((c) => c.attendanceId === r.id);
          const pending = requests.find((c) => c.status === "pending");
          return (
            <article className="correction-history-row" key={r.id}>
              <div className="correction-history-heading">
                <div>
                  <strong>
                    {date(r.workDate, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </strong>
                  <p>
                    {timestamp(r.clockIn)} – {timestamp(r.clockOut)}
                  </p>
                  <small>
                    {duration(r.workedMinutes)} worked ·{" "}
                    {duration(r.overtimeMinutes)} overtime
                  </small>
                </div>
                <Status value={r.status} />
              </div>
              {r.status !== "on_leave" &&
                (pending ? (
                  <p className="correction-hint">
                    Correction pending admin review
                  </p>
                ) : (
                  <Link className="text-button" to={`?correct=${r.id}`}>
                    Request correction
                  </Link>
                ))}
              {requests.map((request) => (
                <RequestSummary key={request.id} request={request} />
              ))}
            </article>
          );
        })}
        {!records.length && (
          <Empty
            title="No attendance records"
            body="Your attendance sessions will appear here."
          />
        )}
      </section>
    </>
  );
}
function Review({
  request,
  periods,
}: {
  request: CorrectionRequest;
  periods: PayrollPeriod[];
}) {
  const [note, setNote] = useState("");
  const navigation = useNavigation();
  const pendingDecision =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "review-attendance-correction"
      ? String(navigation.formData.get("decision") ?? "")
      : "";
  const result = calculateAttendance({
    clockIn: request.proposedClockIn,
    clockOut: request.proposedClockOut,
    normalDayMinutes: NORMAL_DAY_MINUTES,
  });
  const affected = periods.filter(
    (p) => p.periodStart <= request.workDate && p.periodEnd >= request.workDate,
  );
  const action = useActionData<CorrectionResult>();
  return (
    <section
      className="surface correction-panel"
      aria-labelledby="correction-review-title"
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">
            {request.employeeCode} · {date(request.workDate)}
          </p>
          <h2 id="correction-review-title">{request.fullName}</h2>
        </div>
        <Status value={request.status} />
      </div>
      <Comparison
        originalIn={request.originalClockIn}
        originalOut={request.originalClockOut}
        proposedIn={request.proposedClockIn}
        proposedOut={request.proposedClockOut}
      />
      <p className="correction-reason">
        <strong>Employee reason</strong>
        <br />
        {request.reason}
      </p>
      <div className="correction-preview">
        <strong>
          {duration(result.workedMinutes)} worked ·{" "}
          {duration(result.overtimeMinutes)} overtime
        </strong>
        <p>
          Original: {duration(request.originalWorkedMinutes)} worked ·{" "}
          {duration(request.originalOvertimeMinutes)} overtime
        </p>
        <p>
          Change:{" "}
          {request.originalWorkedMinutes === null
            ? "previously incomplete"
            : `${result.workedMinutes! - request.originalWorkedMinutes} worked minutes`}
          ;{" "}
          {request.originalOvertimeMinutes === null
            ? "overtime previously incomplete"
            : `${result.overtimeMinutes! - request.originalOvertimeMinutes} overtime minutes`}
          .
        </p>
      </div>
      <section className="correction-payroll">
        <h3>Payroll context</h3>
        <p>
          Pay basis: {request.salaryType}. Attendance changes affect regular and
          overtime inputs; they are not an exact take-home-pay adjustment.
        </p>
        {affected.map((p) => (
          <p key={p.id}>
            <Link to={`/admin/payroll/${p.id}`}>{p.period} payroll</Link> ·{" "}
            <Status value={p.status} />
          </p>
        ))}
        {!affected.length && <p>No payroll run exists for this date.</p>}
        {affected.some((p) => p.status === "finalised") && (
          <p className="correction-warning" role="note">
            <strong>Finalised payroll period</strong>
            <br />
            Approval updates attendance only. Finalised payroll calculations
            and payslips remain unchanged.
          </p>
        )}
        {request.status === "pending" &&
          affected.some((p) => p.status === "draft") && (
            <p>
              This pending request blocks finalisation of the matching payroll
              period.
            </p>
          )}
      </section>
      {request.status === "pending" && !!request.stale && (
        <p className="correction-warning" role="alert">
          <strong>Attendance changed since submission.</strong>
          <br />
          Current: {timestamp(request.currentClockIn)} –{" "}
          {timestamp(request.currentClockOut)}. Reject this request and ask the
          employee to submit current values.
        </p>
      )}
      {request.rejectionReason && (
        <p className="correction-error">
          <strong>Rejection reason:</strong> {request.rejectionReason}
        </p>
      )}
      {request.reviewedAt && <p>Reviewed {date(request.reviewedAt)}</p>}
      {request.status === "pending" && (
        <Form method="post" className="correction-form">
          <input
            type="hidden"
            name="intent"
            value="review-attendance-correction"
          />
          <input type="hidden" name="id" value={request.id} />
          <div>
            <label htmlFor="rejection-reason">
              Rejection reason (required to reject)
            </label>
            <textarea
              id="rejection-reason"
              name="rejectionReason"
              maxLength={2000}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={navigation.state !== "idle"}
            />
          </div>
          {action && "error" in action && (
            <p role="alert" className="correction-error">
              {action.error}
            </p>
          )}
          <div className="correction-actions">
            <button
              className="button primary"
              name="decision"
              value="approved"
              disabled={!!request.stale || navigation.state !== "idle"}
            >
              {pendingDecision === "approved" ? <><LoaderCircle className="button-spinner" aria-hidden="true" />Approving correction…</> : "Approve correction"}
            </button>
            <button
              className="button secondary"
              name="decision"
              value="rejected"
              disabled={!note.trim() || navigation.state !== "idle"}
            >
              {pendingDecision === "rejected" ? <><LoaderCircle className="button-spinner" aria-hidden="true" />Rejecting correction…</> : "Reject correction"}
            </button>
          </div>
        </Form>
      )}
    </section>
  );
}
export function AdminCorrections({
  requests,
  periods,
}: {
  requests: CorrectionRequest[];
  periods: PayrollPeriod[];
}) {
  const [params] = useSearchParams();
  const status = ["approved", "rejected"].includes(params.get("status") ?? "")
    ? params.get("status")!
    : "pending";
  const filtered = requests.filter((r) => r.status === status);
  const selected = requests.find((r) => r.id === params.get("request"));
  return (
    <TaskWorkspace label="Attendance corrections">
      <WorkspaceHeader
        eyebrow="Time / Review"
        title="Attendance corrections"
        description="Review requested changes before attendance flows into payroll."
        action={
          <Link className="button secondary" to="/admin/attendance">
            Attendance records
          </Link>
        }
      />
      <nav className="tabs" aria-label="Correction status">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <Link
            key={s}
            className={s === status ? "active" : ""}
            to={`?status=${s}`}
          >
            {s[0].toUpperCase() + s.slice(1)}{" "}
            <b>{requests.filter((r) => r.status === s).length}</b>
          </Link>
        ))}
      </nav>
      {selected && (
        <Review key={selected.id} request={selected} periods={periods} />
      )}
      <section
        className="surface correction-queue"
        aria-label={`${status} corrections`}
      >
        {filtered.map((r) => (
          <Link
            className="correction-queue-row"
            key={r.id}
            to={`?status=${status}&request=${r.id}`}
            aria-current={r.id === selected?.id ? "true" : undefined}
          >
            <div>
              <strong>{r.fullName}</strong>
              <small>
                {r.employeeCode} · {date(r.workDate)}
              </small>
            </div>
            <span className="correction-queue-reason">{r.reason}</span>
            <Status value={r.status} />
            <span>Review →</span>
          </Link>
        ))}
        {!filtered.length && (
          <Empty
            title={`No ${status} corrections`}
            body={
              status === "pending"
                ? "New employee requests will appear here for review."
                : "Reviewed requests will appear here."
            }
          />
        )}
      </section>
    </TaskWorkspace>
  );
}
