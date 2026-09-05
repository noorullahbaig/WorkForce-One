import { Form, Link } from "react-router";
import { useState } from "react";
import {
  Check,
  Fingerprint,
  Play,
  QrCode,
  RotateCcw,
  Square,
} from "lucide-react";
import { PageHeader, Status, Empty } from "../../components/portal-ui";
import { date, time, initials } from "../../lib/format";
import type { Attendance, CorrectionRequest } from "./types";
import { EmployeeCorrectionHistory } from "./correction-ui";
type Employee = { id: string; fullName: string; employeeCode: string };
export function AttendancePage({
  records,
  corrections,
}: {
  records: Attendance[];
  corrections: CorrectionRequest[];
}) {
  const [tab, setTab] = useState<"all" | "exceptions">("all");
  const exceptions = records.filter(
    (r) => r.status === "missing_clock_out" || r.status === "late",
  );
  const displayRecords = tab === "exceptions" ? exceptions : records;

  return (
    <>
      <PageHeader
        eyebrow="Time"
        title="Attendance"
        description="Live records from fingerprint, QR and manual corrections."
        action={
          <Link className="button primary" to="/admin/attendance/simulate">
            <Fingerprint />
            Open terminal
          </Link>
        }
      />
      <div className="tabs">
        <Link to="/admin/attendance/corrections">
          Corrections{" "}
          <b>{corrections.filter((c) => c.status === "pending").length}</b>
        </Link>
        <button
          className={tab === "all" ? "active" : ""}
          onClick={() => setTab("all")}
        >
          Daily records
        </button>
        <button
          className={tab === "exceptions" ? "active" : ""}
          onClick={() => setTab("exceptions")}
        >
          Needs attention <b>{exceptions.length}</b>
        </button>
      </div>
      <section className="table surface attendance-table">
        <div className="table-head">
          <span>Employee</span>
          <span>Date</span>
          <span>Clock in</span>
          <span>Clock out</span>
          <span>Worked</span>
          <span>Status</span>
        </div>
        {displayRecords.length ? (
          displayRecords.map((r) => (
            <div className="table-row" key={r.id}>
              <span className="person">
                <i>{initials(r.fullName)}</i>
                <span>
                  <strong>{r.fullName}</strong>
                  <small>{r.employeeCode}</small>
                </span>
              </span>
              <span>
                {date(r.workDate, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span>
                <strong>{time(r.clockIn)}</strong>
                <small>{r.clockInMethod ?? "—"}</small>
              </span>
              <span>
                <strong>{time(r.clockOut)}</strong>
                <small>{r.clockOutMethod ?? "Needs correction"}</small>
              </span>
              <span>
                {r.workedMinutes
                  ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m`
                  : "—"}
              </span>
              <span>
                <Status value={r.status} />
                {corrections.some(
                  (c) => c.attendanceId === r.id && c.status === "pending",
                ) ? (
                  <Link
                    to={`/admin/attendance/corrections?request=${corrections.find((c) => c.attendanceId === r.id && c.status === "pending")!.id}`}
                  >
                    Review correction
                  </Link>
                ) : r.status === "missing_clock_out" ? (
                  <small>No correction requested</small>
                ) : null}
              </span>
            </div>
          ))
        ) : (
          <Empty
            title="No exceptions"
            body="All shifts are complete and reconciled."
          />
        )}
      </section>
    </>
  );
}

export function Simulator({
  employees,
  attendance,
  today,
}: {
  employees: Employee[];
  attendance: Attendance[];
  today: string;
}) {
  const [selectedId, setSelectedId] = useState(employees[0]?.id ?? "emp-001");
  const empAttendance = attendance.filter(
    (r) => r.employeeId === selectedId && r.workDate === today,
  );
  const openShift = empAttendance.find((r) => !r.clockOut);
  const selectedEmp = employees.find((e) => e.id === selectedId);

  return (
    <>
      <PageHeader
        eyebrow="Time / Terminal"
        title="Attendance terminal"
        description="Simulate biometric clock-in/out terminal events and verify time calculations."
        action={
          <Link className="button secondary" to="/admin/attendance">
            View records
          </Link>
        }
      />
      <div className="simulator-grid">
        <section className="surface simulator">
          <div className="sim-display">
            <span className="live-dot">Terminal active</span>
            <div className="scan-ring">
              <Fingerprint />
            </div>
            <h2>{openShift ? "Clock-out capture" : "Clock-in capture"}</h2>
            <p>
              {openShift
                ? `${selectedEmp?.fullName} clocked in at ${time(openShift.clockIn)}. Press capture to record shift departure at 6:15 PM MYT.`
                : `${selectedEmp?.fullName || "Employee"} is not on shift. Press capture to record morning arrival at 9:00 AM MYT.`}
            </p>
          </div>
          <Form method="post" className="form-stack">
            <input type="hidden" name="intent" value="simulate-attendance" />
            <label>
              Employee
              <select
                name="employeeId"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {employees.map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.fullName} · {e.employeeCode}
                  </option>
                ))}
              </select>
            </label>
            <div className="method-choice">
              <label>
                <input
                  type="radio"
                  name="method"
                  value="fingerprint"
                  defaultChecked
                />
                <span>
                  <Fingerprint />
                  <strong>Fingerprint</strong>
                  <small>Front counter device</small>
                </span>
              </label>
              <label>
                <input type="radio" name="method" value="qr" />
                <span>
                  <QrCode />
                  <strong>QR code</strong>
                  <small>Employee mobile scan</small>
                </span>
              </label>
            </div>
            <button className="button primary wide">Capture attendance</button>
          </Form>
        </section>
        <aside className="surface sim-aside">
          <p className="eyebrow">Terminal operation</p>
          <h3>Device event processing</h3>
          <ul>
            <li>
              <Check />
              Creates or completes an attendance record
            </li>
            <li>
              <Check />
              Stores the chosen device method
            </li>
            <li>
              <Check />
              Calculates worked time and overtime
            </li>
            <li>
              <Check />
              Updates payroll inputs instantly
            </li>
          </ul>
          {empAttendance.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid var(--line)",
              }}
            >
              <p className="eyebrow" style={{ marginBottom: "6px" }}>
                Today's events for {selectedEmp?.fullName.split(" ")[0]}
              </p>
              {empAttendance.map((r) => (
                <div
                  key={r.id}
                  style={{
                    fontSize: ".8rem",
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <span>
                    {time(r.clockIn)} –{" "}
                    {r.clockOut ? time(r.clockOut) : "Active"}
                  </span>
                  <Status value={r.status} />
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export function EmployeeAttendance({
  records,
  today,
  corrections,
}: {
  records: Attendance[];
  employee: Employee;
  today: string;
  corrections: CorrectionRequest[];
}) {
  const todayRecords = records.filter((r) => r.workDate === today);
  const openSession = todayRecords.find((r) => !r.clockOut);
  const totalWorkedMins = todayRecords.reduce(
    (sum, r) => sum + (r.workedMinutes ?? 0),
    0,
  );
  const completedCount = todayRecords.filter((r) => r.clockOut).length;
  const [method, setMethod] = useState<"fingerprint" | "qr">("fingerprint");

  return (
    <>
      <PageHeader
        eyebrow="Self-service"
        title="Attendance"
        description="Your workday history in Malaysia time."
      />

      <section className="employee-clock-card">
        <div className="employee-clock-info">
          <p className="eyebrow light">Shift Terminal</p>
          <h2>
            {openSession
              ? "Currently on shift"
              : todayRecords.length > 0
                ? `${(totalWorkedMins / 60).toFixed(1)}h worked today`
                : "Ready to start shift"}
          </h2>
          <p>
            {openSession
              ? `Active session started at ${time(openSession.clockIn)} (${openSession.clockInMethod === "qr" ? "QR Code" : "Fingerprint"} scan)`
              : todayRecords.length > 0
                ? `Total cumulative time: ${(totalWorkedMins / 60).toFixed(1)} hours across ${completedCount} completed shift${completedCount === 1 ? "" : "s"}.`
                : "Select biometric scan method and clock in with one click."}
          </p>

          <div
            className="clock-method-toggle"
            style={{ display: "flex", gap: "8px", marginTop: "12px" }}
          >
            <button
              type="button"
              onClick={() => setMethod("fingerprint")}
              className={`button small ${method === "fingerprint" ? "paper" : "ghost"}`}
              style={{
                color: method === "fingerprint" ? "var(--ink)" : "#9fb3b1",
                borderColor: "#3a504d",
              }}
            >
              <Fingerprint size={14} /> Fingerprint
            </button>
            <button
              type="button"
              onClick={() => setMethod("qr")}
              className={`button small ${method === "qr" ? "paper" : "ghost"}`}
              style={{
                color: method === "qr" ? "var(--ink)" : "#9fb3b1",
                borderColor: "#3a504d",
              }}
            >
              <QrCode size={14} /> QR Code
            </button>
          </div>
        </div>

        <div
          className="employee-clock-actions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "flex-end",
          }}
        >
          {openSession ? (
            <Form method="post" style={{ margin: 0 }}>
              <input type="hidden" name="intent" value="employee-clock" />
              <input type="hidden" name="actionType" value="clock-out" />
              <input type="hidden" name="method" value={method} />
              <button className="button paper">
                <Square size={16} /> Clock Out (
                {method === "fingerprint" ? "Fingerprint" : "QR"})
              </button>
            </Form>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <Form method="post" style={{ margin: 0 }}>
                <input type="hidden" name="intent" value="employee-clock" />
                <input type="hidden" name="actionType" value="clock-in" />
                <input type="hidden" name="method" value={method} />
                <button className="button paper">
                  <Play size={16} />{" "}
                  {todayRecords.length > 0
                    ? "Clock In (Next Shift)"
                    : "Clock In"}{" "}
                  ({method === "fingerprint" ? "Fingerprint" : "QR"})
                </button>
              </Form>
              {todayRecords.length > 0 &&
                !corrections.some((c) =>
                  todayRecords.some((r) => r.id === c.attendanceId),
                ) && (
                  <Form method="post" style={{ margin: 0 }}>
                    <input type="hidden" name="intent" value="employee-clock" />
                    <input type="hidden" name="actionType" value="reset" />
                    <button
                      className="button ghost"
                      style={{ color: "#9fb3b1", borderColor: "#3a504d" }}
                    >
                      <RotateCcw size={14} /> Reset today
                    </button>
                  </Form>
                )}
            </div>
          )}
        </div>
      </section>

      <section className="attendance-today">
        <div>
          <p className="eyebrow light">
            Today’s Summary · {date(today, { day: "numeric", month: "short" })}
          </p>
          <h2>
            {openSession
              ? "Shift in progress"
              : todayRecords.length > 0
                ? `${(totalWorkedMins / 60).toFixed(1)} hours recorded`
                : "No activity recorded"}
          </h2>
          <p>
            {todayRecords.length > 0
              ? `${todayRecords.length} recorded session${todayRecords.length === 1 ? "" : "s"} · Cumulative daily total`
              : "Ready for next shift scan."}
          </p>
        </div>
        <div className="timeline">
          <span className="active">
            <i />
            <small>{openSession ? "Latest in" : "First in"}</small>
            <strong>{time(todayRecords[0]?.clockIn)}</strong>
          </span>
          <b />
          <span
            className={todayRecords.some((r) => r.clockOut) ? "active" : ""}
          >
            <i />
            <small>{openSession ? "Current" : "Latest out"}</small>
            <strong>
              {openSession
                ? "On shift"
                : time(todayRecords[todayRecords.length - 1]?.clockOut)}
            </strong>
          </span>
        </div>
      </section>

      <EmployeeCorrectionHistory records={records} corrections={corrections} />
    </>
  );
}
