import { Form, Link, useSearchParams } from "react-router";
import { useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Fingerprint,
  Play,
  QrCode,
  RotateCcw,
  Search,
  Square,
  X,
} from "lucide-react";
import {
  PageHeader,
  Status,
  Empty,
  ScrollableRegion,
  TaskWorkspace,
  WorkspaceHeader,
  WorkspaceToolbar,
} from "../../components/portal-ui";
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
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"all" | "exceptions">("all");
  const query = params.get("q") ?? "";
  const range = params.get("range") ?? "all";

  const pendingCorrections = corrections.filter((c) => c.status === "pending");

  // Date range filter
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10);

  const dateFiltered = records.filter((r) => {
    if (range === "today") return r.workDate === today;
    if (range === "week") return r.workDate >= weekAgo;
    if (range === "month") return r.workDate >= monthAgo;
    return true;
  });

  const exceptions = dateFiltered.filter(
    (r) => r.status === "missing_clock_out" || r.status === "late",
  );

  const searched = (tab === "exceptions" ? exceptions : dateFiltered).filter((r) =>
    `${r.fullName} ${r.employeeCode}`.toLowerCase().includes(query.toLowerCase()),
  );

  const totalForBadge = tab === "exceptions" ? exceptions.length : dateFiltered.length;

  function updateParam(name: string, value: string, defaultValue = "") {
    const next = new URLSearchParams(params);
    if (value === defaultValue || !value) next.delete(name);
    else next.set(name, value);
    setParams(next, { preventScrollReset: true });
  }

  return (
    <TaskWorkspace label="Attendance records" scrollMode="list">
      <WorkspaceHeader
        eyebrow="Time"
        title="Attendance"
        description="Live records from fingerprint, QR and manual corrections."
        action={
          <>
            {pendingCorrections.length > 0 && (
              <Link className="button secondary" to="/admin/attendance/corrections">
                <AlertCircle size={15} />
                {pendingCorrections.length} pending correction{pendingCorrections.length === 1 ? "" : "s"}
              </Link>
            )}
            <Link className="button primary" to="/admin/attendance/simulate">
              <Fingerprint />
              Attendance capture
            </Link>
          </>
        }
      />

      <WorkspaceToolbar label="Attendance controls">
        <div className="balance-search-pill">
          <Search size={15} />
          <input
            aria-label="Search employees"
            placeholder="Search name or ID…"
            value={query}
            onChange={(e) => updateParam("q", e.target.value)}
          />
          {query && (
            <button type="button" aria-label="Clear search" className="balance-search-clear" onClick={() => updateParam("q", "")}>
              <X size={13} />
            </button>
          )}
          <span className="balance-count-badge">
            {query || range !== "all"
              ? `Showing ${searched.length} of ${totalForBadge}`
              : `${records.length} records`}
          </span>
        </div>
        <div className="people-filter-row">
          <select
            aria-label="Date range"
            value={range}
            onChange={(e) => updateParam("range", e.target.value, "all")}
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </div>
      </WorkspaceToolbar>

      <div className="tabs">
        <button
          className={tab === "all" ? "active" : ""}
          onClick={() => setTab("all")}
        >
          All records
        </button>
        <button
          className={tab === "exceptions" ? "active" : ""}
          onClick={() => setTab("exceptions")}
        >
          Needs attention <b>{exceptions.length}</b>
        </button>
      </div>

      <ScrollableRegion label="Attendance results" className="table surface attendance-table">
        <div className="table-head">
          <span>Employee</span>
          <span>Date</span>
          <span>Clock in</span>
          <span>Clock out</span>
          <span>Worked</span>
          <span>Status</span>
        </div>
        {searched.length ? (
          searched.map((r) => {
            const pendingCorrection = corrections.find(
              (c) => c.attendanceId === r.id && c.status === "pending",
            );
            return (
              <div className="table-row" key={r.id}>
                <span className="person">
                  <i>{initials(r.fullName)}</i>
                  <span>
                    <strong>{r.fullName}</strong>
                    <small>{r.employeeCode}</small>
                  </span>
                </span>
                <span data-label="Date">
                  {date(r.workDate, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span data-label="Clock in">
                  <strong>{time(r.clockIn)}</strong>
                  <small>{r.clockInMethod ?? "—"}</small>
                </span>
                <span data-label="Clock out">
                  <strong>{r.clockOut ? time(r.clockOut) : "—"}</strong>
                  <small>{r.clockOut ? (r.clockOutMethod ?? "—") : "Missing"}</small>
                </span>
                <span data-label="Worked">
                  {r.workedMinutes
                    ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m`
                    : "—"}
                </span>
                <span className="attendance-status" data-label="Status">
                  <Status value={r.status} />
                  {pendingCorrection && (
                    <Link
                      className="correction-pill"
                      to={`/admin/attendance/corrections?request=${pendingCorrection.id}`}
                    >
                      Review correction <ChevronRight size={11} />
                    </Link>
                  )}
                </span>
              </div>
            );
          })
        ) : (
          <Empty
            title={tab === "exceptions" ? "No exceptions" : "No records found"}
            body={tab === "exceptions" ? "All shifts are complete and reconciled." : "Try adjusting your search or date filter."}
          />
        )}
      </ScrollableRegion>
    </TaskWorkspace>
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
        eyebrow="Time / Capture"
        title="Attendance capture"
        description="Record employee clock-in and clock-out events and verify time calculations."
        action={
          <Link className="button secondary" to="/admin/attendance">
            View records
          </Link>
        }
      />
      <div className="simulator-grid">
        <section className="surface simulator">
          <div className="sim-display">
            <span className="live-dot">Ready to record</span>
            <div className="scan-ring">
              <Fingerprint />
            </div>
            <h2>{openShift ? "Clock-out capture" : "Clock-in capture"}</h2>
            <p>
              {openShift
                ? `${selectedEmp?.fullName} clocked in at ${time(openShift.clockIn)}. Press capture to record shift departure.`
                : `${selectedEmp?.fullName || "Employee"} is not on shift. Press capture to record arrival.`}
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
                <input type="radio" name="method" value="fingerprint" defaultChecked />
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
          <p className="eyebrow">Attendance operation</p>
          <h3>How attendance is processed</h3>
          <ul>
            <li><Check />Creates or completes an attendance record</li>
            <li><Check />Stores the chosen device method</li>
            <li><Check />Calculates worked time and overtime</li>
            <li><Check />Updates payroll inputs instantly</li>
          </ul>
          {empAttendance.length > 0 && (
            <div className="sim-today-events">
              <p className="eyebrow">
                Today's events for {selectedEmp?.fullName.split(" ")[0]}
              </p>
              {empAttendance.map((r) => (
                <div className="sim-today-row" key={r.id}>
                  <span>
                    {time(r.clockIn)} – {r.clockOut ? time(r.clockOut) : "Active"}
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
          <div className="shift-badge-row">
            <span className={`status ${openSession ? "active" : todayRecords.length > 0 ? "active" : "pending"}`}>
              <i /> {openSession ? "On shift" : todayRecords.length > 0 ? "Shift completed" : "Off shift"}
            </span>
            {todayRecords.length > 0 && (
              <span className="shift-time-chip">
                {(totalWorkedMins / 60).toFixed(1)}h worked today
              </span>
            )}
          </div>
          <h2>
            {openSession
              ? `Clocked in at ${time(openSession.clockIn)}`
              : todayRecords.length > 0
                ? `${(totalWorkedMins / 60).toFixed(1)}h across ${completedCount} completed shift${completedCount === 1 ? "" : "s"}`
                : "Ready to start shift"}
          </h2>
          <p>
            {openSession
              ? `Authenticated via ${openSession.clockInMethod === "qr" ? "QR code" : "fingerprint"}. Tap Clock Out when your shift ends.`
              : todayRecords.length > 0
                ? "Daily cumulative hours are recorded in Malaysia Standard Time."
                : "Choose your verification method and tap Clock In."}
          </p>
          <div className="clock-method-toggle">
            <button
              type="button"
              aria-pressed={method === "fingerprint"}
              onClick={() => setMethod("fingerprint")}
              className={`button small ${method === "fingerprint" ? "paper" : "ghost"}`}
            >
              <Fingerprint size={14} /> Fingerprint
            </button>
            <button
              type="button"
              aria-pressed={method === "qr"}
              onClick={() => setMethod("qr")}
              className={`button small ${method === "qr" ? "paper" : "ghost"}`}
            >
              <QrCode size={14} /> QR Code
            </button>
          </div>
        </div>

        <div className="employee-clock-actions">
          {openSession ? (
            <Form method="post" style={{ margin: 0 }}>
              <input type="hidden" name="intent" value="employee-clock" />
              <input type="hidden" name="actionType" value="clock-out" />
              <input type="hidden" name="method" value={method} />
              <button className="button paper">
                <Square size={16} /> Clock Out
              </button>
            </Form>
          ) : (
            <div className="clock-in-group">
              <Form method="post" style={{ margin: 0 }}>
                <input type="hidden" name="intent" value="employee-clock" />
                <input type="hidden" name="actionType" value="clock-in" />
                <input type="hidden" name="method" value={method} />
                <button className="button paper">
                  <Play size={16} />{" "}
                  {todayRecords.length > 0 ? "Clock In — Next shift" : "Clock In"}
                </button>
              </Form>
              {todayRecords.length > 0 &&
                !corrections.some((c) =>
                  todayRecords.some((r) => r.id === c.attendanceId),
                ) && (
                  <Form method="post" style={{ margin: 0 }}>
                    <input type="hidden" name="intent" value="employee-clock" />
                    <input type="hidden" name="actionType" value="reset" />
                    <button className="button ghost clock-reset-btn">
                      <RotateCcw size={14} /> Reset today
                    </button>
                  </Form>
                )}
            </div>
          )}
        </div>
      </section>

      <EmployeeCorrectionHistory records={records} corrections={corrections} />
    </>
  );
}
