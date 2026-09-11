import { ChevronLeft, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Form } from "react-router";
import { initials, money } from "../../lib/format";
import { PendingButton } from "../../components/portal-ui";

export type PayrollReviewEmployee = {
  id: string;
  employeeCode: string;
  fullName: string;
  salaryType: "monthly" | "hourly";
  monthlySalarySen: number | null;
  hourlyRateSen: number | null;
};

export type PayrollAttendanceInput = {
  employeeId: string;
  workedMinutes: number;
  overtimeMinutes: number;
};

export type PayrollReviewAdjustment = {
  id?: string;
  employeeId: string;
  type: string;
  description: string;
  amountSen: number;
  reason?: string | null;
};

export type PayrollStoredResult = {
  employeeId: string;
  grossPaySen: number;
  totalDeductionsSen: number;
  netPaySen: number;
  breakdownJson: string;
};

export function PayrollEmployeeReview({
  employees,
  attendance,
  blocked = false,
  adjustments = [],
  storedResults = [],
  runStatus = "draft",
  policyName = "MY Standard 2026",
  payrollRunId,
  selectedEmployeeId,
  onSelectEmployee,
  onClearSelection,
}: {
  employees: PayrollReviewEmployee[];
  attendance: PayrollAttendanceInput[];
  blocked?: boolean;
  adjustments?: PayrollReviewAdjustment[];
  storedResults?: PayrollStoredResult[];
  runStatus?: "draft" | "finalised";
  policyName?: string;
  payrollRunId?: string;
  selectedEmployeeId?: string | null;
  onSelectEmployee?: (employeeId: string) => void;
  onClearSelection?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [payBasis, setPayBasis] = useState("all");
  const [attendanceInput, setAttendanceInput] = useState("all");
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);

  const attendanceByEmployee = useMemo(
    () => new Map(attendance.map((item) => [item.employeeId, item])),
    [attendance],
  );
  const resultByEmployee = useMemo(
    () => new Map(storedResults.map((result) => [result.employeeId, result])),
    [storedResults],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return employees.filter((employee) => {
      if (runStatus === "finalised" && !resultByEmployee.has(employee.id)) return false;
      const input = attendanceByEmployee.get(employee.id);
      const matchesQuery =
        !normalizedQuery ||
        employee.fullName.toLowerCase().includes(normalizedQuery) ||
        employee.employeeCode.toLowerCase().includes(normalizedQuery);
      const matchesPayBasis =
        payBasis === "all" || employee.salaryType === payBasis;
      const matchesAttendance =
        attendanceInput === "all" ||
        (attendanceInput === "recorded" && (input?.workedMinutes ?? 0) > 0) ||
        (attendanceInput === "missing" && (input?.workedMinutes ?? 0) === 0) ||
        (attendanceInput === "overtime" && (input?.overtimeMinutes ?? 0) > 0);
      return matchesQuery && matchesPayBasis && matchesAttendance;
    });
  }, [attendanceByEmployee, attendanceInput, employees, payBasis, query, resultByEmployee, runStatus]);

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const selectedAttendance = selectedEmployee
    ? attendanceByEmployee.get(selectedEmployee.id)
    : undefined;
  const selectedAdjustments = selectedEmployee
    ? adjustments.filter((adjustment) => adjustment.employeeId === selectedEmployee.id)
    : [];
  const selectedNetAdjSen = selectedAdjustments.reduce(
    (sum, a) => sum + (a.type === "deduction" ? -a.amountSen : a.amountSen),
    0,
  );
  const selectedResult = selectedEmployee
    ? storedResults.find((result) => result.employeeId === selectedEmployee.id)
    : undefined;

  let storedBreakdown: Record<string, number> = {};
  if (selectedResult) {
    try {
      storedBreakdown = JSON.parse(selectedResult.breakdownJson) as Record<string, number>;
    } catch {
      storedBreakdown = {};
    }
  }

  return (
    <section className="surface payroll-review" aria-labelledby="employee-pay-review-title">
      <div className="payroll-review-title">
        <div>
          <p className="eyebrow">{runStatus === "finalised" ? "Stored payroll results" : "Payroll inputs"}</p>
          <h2 id="employee-pay-review-title">Employee pay review</h2>
          <p>{runStatus === "finalised" ? "Review the immutable results used to publish employee payslips." : "Review attendance and pay inputs before finalising payroll."}</p>
        </div>
        <span className={`review-state${blocked ? " is-blocked" : ""}`}>
          {runStatus === "finalised" ? "Finalised" : blocked ? "Needs attention" : "Ready for review"}
        </span>
      </div>

      <div className={`payroll-review-toolbar${runStatus === "finalised" ? " is-finalised" : ""}`}>
        <div className="balance-search-pill">
          <Search size={15} />
          <input
            aria-label="Search employees"
            placeholder="Search name or employee ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              className="balance-search-clear"
              onClick={() => setQuery("")}
            >
              <X size={13} />
            </button>
          )}
          <span className="balance-count-badge">
            {query || payBasis !== "all" || attendanceInput !== "all"
              ? `Showing ${filtered.length} of ${employees.length}`
              : `${filtered.length} ${filtered.length === 1 ? "employee" : "employees"}`}
          </span>
        </div>
        {runStatus === "draft" && (
          <div className="people-filter-row">
            <select
              aria-label="Pay basis"
              value={payBasis}
              onChange={(event) => setPayBasis(event.target.value)}
            >
              <option value="all">All pay bases</option>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
            </select>
            <select
              aria-label="Attendance input"
              value={attendanceInput}
              onChange={(event) => setAttendanceInput(event.target.value)}
            >
              <option value="all">All attendance</option>
              <option value="recorded">Recorded hours</option>
              <option value="missing">No recorded hours</option>
              <option value="overtime">Overtime</option>
            </select>
          </div>
        )}
      </div>

      <div className={`payroll-review-layout${selectedEmployee ? " has-selection" : ""}`}>
        <div className="payroll-review-list">
          <div className="review-head">
            <span>Employee</span>
            <span>{runStatus === "finalised" ? "Gross pay" : "Pay basis"}</span>
            <span>{runStatus === "finalised" ? "Deductions" : "Attendance input"}</span>
            <span>{runStatus === "finalised" ? "Net pay" : "Adjustments & Status"}</span>
          </div>
          <div className="payroll-review-rows">
          {filtered.length ? (
            filtered.map((employee) => {
              const input = attendanceByEmployee.get(employee.id);
              const result = resultByEmployee.get(employee.id);
              const empAdjustments = adjustments.filter((a) => a.employeeId === employee.id);
              const netAdjSen = empAdjustments.reduce(
                (sum, a) => sum + (a.type === "deduction" ? -a.amountSen : a.amountSen),
                0,
              );
              return (
                <button
                  className={`review-row${selectedEmployeeId === employee.id ? " active" : ""}`}
                  key={employee.id}
                  type="button"
                  aria-label={`Review ${employee.fullName}`}
                  aria-expanded={selectedEmployeeId === employee.id}
                  onClick={() => onSelectEmployee?.(employee.id)}
                >
                  <span className="person">
                    <i>{initials(employee.fullName)}</i>
                    <span>
                      <strong>{employee.fullName}</strong>
                      <small>{employee.employeeCode}</small>
                    </span>
                  </span>
                  <span data-label={runStatus === "finalised" ? "Gross pay" : "Pay basis"}>
                    <strong>
                      {runStatus === "finalised"
                        ? money(result?.grossPaySen)
                        : employee.salaryType === "monthly"
                        ? money(employee.monthlySalarySen)
                        : `${money(employee.hourlyRateSen)}/hr`}
                    </strong>
                    <small>{runStatus === "finalised" ? "Stored result" : employee.salaryType}</small>
                  </span>
                  <span data-label={runStatus === "finalised" ? "Deductions" : "Attendance"}>
                    <strong>
                      {runStatus === "finalised"
                        ? money(result?.totalDeductionsSen)
                        : (input?.workedMinutes ?? 0) > 0
                        ? `${input?.workedMinutes} min`
                        : employee.salaryType === "monthly"
                        ? "Monthly base"
                        : "No hours"}
                    </strong>
                    <small>{runStatus === "finalised" ? "Finalised" : `${input?.overtimeMinutes ?? 0} OT min`}</small>
                  </span>
                  <span data-label={runStatus === "finalised" ? "Net pay" : "Adjustments"}>
                    {runStatus === "finalised" ? (
                      <>
                        <strong>{money(result?.netPaySen)}</strong>
                        <small>Published payslip</small>
                      </>
                    ) : empAdjustments.length > 0 ? (
                      <>
                        <strong className={netAdjSen >= 0 ? "delta-positive" : "delta-negative"}>
                          {netAdjSen >= 0 ? "+" : ""}{money(netAdjSen)}
                        </strong>
                        <small>{empAdjustments.length} adjustment{empAdjustments.length === 1 ? "" : "s"}</small>
                      </>
                    ) : (
                      <>
                        <strong style={{ color: "var(--emerald)" }}>Ready</strong>
                        <small>No adjustments</small>
                      </>
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="payroll-review-empty">
              <strong>{runStatus === "finalised" ? "No stored results" : "No matching employees"}</strong>
              <span>{runStatus === "finalised" ? "This run has no published employee results matching your search." : "Adjust your search or filters to see payroll inputs."}</span>
            </div>
          )}
          </div>
        </div>

        {selectedEmployee && (
          <aside
            className="payroll-review-inspector"
            role="region"
            aria-label={`${selectedEmployee.fullName} payroll detail`}
          >
            <header className="inspector-pinned-header">
              <div className="inspector-top-bar">
                <button
                  type="button"
                  className="inspector-back-btn"
                  onClick={onClearSelection}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  <span>Back to employees</span>
                </button>
                <span className="inspector-eyebrow-chip">
                  {runStatus === "finalised" ? "Finalised profile" : "Draft payroll profile"}
                </span>
                <button
                  type="button"
                  className="inspector-close-btn"
                  aria-label="Close employee detail"
                  onClick={onClearSelection}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>

              <div className="inspector-person-banner">
                <i className="review-avatar">{initials(selectedEmployee.fullName)}</i>
                <div className="inspector-person-meta">
                  <h2 id="inspector-employee-title" className="inspector-person-name">
                    {selectedEmployee.fullName}
                  </h2>
                  <span className="inspector-person-code">
                    {selectedEmployee.employeeCode} · {selectedEmployee.salaryType.toUpperCase()}
                  </span>
                </div>
                <span className={`status ${runStatus === "finalised" ? "finalised" : "draft"}`}>
                  <i /> {runStatus === "finalised" ? "Finalised" : "Draft"}
                </span>
              </div>
            </header>

            <div className="payroll-inspector-body">
            {runStatus === "finalised" && selectedResult ? (
              <>
                <p className="balance-field-label" style={{ marginTop: "2px" }}>Stored finalised result</p>
                <div className="payroll-net-result"><span>Net pay</span><strong>{money(selectedResult.netPaySen)}</strong></div>
                <dl className="payroll-inspector-values">
                  <div><dt>Gross pay</dt><dd>{money(selectedResult.grossPaySen)}</dd></div>
                  <div><dt>Total deductions</dt><dd>{money(selectedResult.totalDeductionsSen)}</dd></div>
                  <div><dt>Base pay</dt><dd>{money(storedBreakdown.basePaySen)}</dd></div>
                  <div><dt>Overtime</dt><dd>{money(storedBreakdown.overtimePaySen)}</dd></div>
                  <div><dt>Allowances</dt><dd>{money(storedBreakdown.allowanceSen)}</dd></div>
                  <div><dt>PCB</dt><dd>{money(storedBreakdown.pcbSen)}</dd></div>
                </dl>
              </>
            ) : (
              <>
                <p className="balance-field-label" style={{ marginTop: "2px" }}>Pay &amp; attendance inputs</p>
                <dl className="payroll-inspector-values">
                  <div><dt>Pay basis</dt><dd>{selectedEmployee.salaryType}</dd></div>
                  <div><dt>Current rate</dt><dd>{selectedEmployee.salaryType === "monthly" ? money(selectedEmployee.monthlySalarySen) : `${money(selectedEmployee.hourlyRateSen)}/hr`}</dd></div>
                  <div><dt>Worked time</dt><dd>{selectedAttendance?.workedMinutes ?? 0} min</dd></div>
                  <div><dt>Overtime</dt><dd>{selectedAttendance?.overtimeMinutes ?? 0} min</dd></div>
                  <div className="wide"><dt>Statutory policy</dt><dd>{policyName}<small>EPF · SOCSO · EIS</small></dd></div>
                  <div className="wide">
                    <dt>Ad-hoc adjustments balance</dt>
                    <dd>
                      {selectedAdjustments.length > 0 ? (
                        <span className={selectedNetAdjSen >= 0 ? "delta-positive" : "delta-negative"} style={{ fontWeight: 750 }}>
                          {selectedNetAdjSen >= 0 ? "+" : ""}{money(selectedNetAdjSen)}
                          <small>{selectedAdjustments.length} active item{selectedAdjustments.length === 1 ? "" : "s"}</small>
                        </span>
                      ) : (
                        <span style={{ color: "var(--emerald-dark)", fontWeight: 700 }}>
                          RM 0.00 <small>No active adjustments</small>
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="payroll-input-adjustments">
                  <div className="section-head" style={{ marginBottom: "10px", marginTop: "16px" }}>
                    <p className="balance-field-label" style={{ margin: 0 }}>Ad-hoc adjustments</p>
                    {runStatus === "draft" && (
                      <button
                        type="button"
                        className="adj-add-btn"
                        onClick={() => setShowAddAdjustment(!showAddAdjustment)}
                      >
                        <Plus size={13} /> {showAddAdjustment ? "Cancel" : "Add adjustment"}
                      </button>
                    )}
                  </div>

                  {showAddAdjustment && payrollRunId && (
                    <Form method="post" className="inspector-adjustment-form" onSubmit={() => setShowAddAdjustment(false)}>
                      <input type="hidden" name="intent" value="add-adjustment" />
                      <input type="hidden" name="payrollRunId" value={payrollRunId} />
                      <input type="hidden" name="employeeId" value={selectedEmployee.id} />
                      <div className="form-pair tight">
                        <label>
                          Type
                          <select name="type" required defaultValue="allowance">
                            <option value="allowance">Allowance (+)</option>
                            <option value="bonus">Bonus / Incentive (+)</option>
                            <option value="deduction">Deduction (-)</option>
                            <option value="pcb">PCB Tax adjustment</option>
                          </select>
                        </label>
                        <label>
                          Amount (RM)
                          <input name="amountRm" type="number" step="0.01" min="1" placeholder="100.00" required />
                        </label>
                      </div>
                      <label>
                        Description
                        <input name="description" placeholder="e.g. Travel allowance, Uniform" required />
                      </label>
                      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        <button
                          type="button"
                          className="button secondary"
                          style={{ minHeight: "34px", padding: "0 12px", fontSize: ".76rem" }}
                          onClick={() => setShowAddAdjustment(false)}
                        >
                          Cancel
                        </button>
                        <PendingButton intent="add-adjustment" pendingLabel="Adding…">
                          Add to payroll
                        </PendingButton>
                      </div>
                    </Form>
                  )}

                  {selectedAdjustments.length > 0 ? (
                    <>
                      <div className="adj-summary-banner">
                        <span className="adj-summary-label">
                          Net impact ({selectedAdjustments.length} item{selectedAdjustments.length === 1 ? "" : "s"})
                        </span>
                        <strong className={`adj-summary-value ${selectedNetAdjSen >= 0 ? "positive" : "negative"}`}>
                          {selectedNetAdjSen >= 0 ? "+" : ""}{money(selectedNetAdjSen)}
                        </strong>
                      </div>
                      <div className="inspector-adjustment-list">
                        {selectedAdjustments.map((adjustment, index) => {
                          const isDeduction = adjustment.type === "deduction";
                          return (
                            <div
                              className={`inspector-adj-card ${isDeduction ? "is-deduction" : "is-addition"}`}
                              key={adjustment.id ?? `${adjustment.description}-${index}`}
                            >
                              <div className="adj-card-main">
                                <div className="adj-card-title-row">
                                  <strong className="adj-card-name">{adjustment.description}</strong>
                                  <span className={`adj-type-pill ${adjustment.type}`}>
                                    {adjustment.type === "deduction" ? "Deduction" : adjustment.type === "bonus" ? "Bonus" : adjustment.type === "pcb" ? "PCB" : "Allowance"}
                                  </span>
                                </div>
                                {adjustment.reason && (
                                  <small className="adj-card-reason">{adjustment.reason}</small>
                                )}
                              </div>
                              <div className="adj-card-action-row">
                                <span className={`adj-card-amount ${isDeduction ? "negative" : "positive"}`}>
                                  {isDeduction ? "-" : "+"}{money(adjustment.amountSen)}
                                </span>
                                {adjustment.id && runStatus === "draft" && (
                                  <Form method="post" style={{ margin: 0 }}>
                                    <input type="hidden" name="intent" value="delete-adjustment" />
                                    <input type="hidden" name="id" value={adjustment.id} />
                                    <button
                                      type="submit"
                                      className="adj-delete-btn"
                                      aria-label={`Delete ${adjustment.description}`}
                                      title="Remove adjustment"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </Form>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="adj-empty-state">
                      <ShieldCheck size={16} />
                      <span>No ad-hoc adjustments added for this period.</span>
                    </div>
                  )}
                </div>
              </>
            )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
