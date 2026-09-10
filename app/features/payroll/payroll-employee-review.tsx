import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { initials, money } from "../../lib/format";

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
  employeeId: string;
  type: string;
  description: string;
  amountSen: number;
};

export type PayrollStoredResult = {
  employeeId: string;
  grossPaySen: number;
  totalDeductionsSen: number;
  netPaySen: number;
  breakdownJson: string;
};

const PAGE_SIZE = 10;

export function PayrollEmployeeReview({
  employees,
  attendance,
  blocked = false,
  adjustments = [],
  storedResults = [],
  runStatus = "draft",
  policyName = "MY Standard 2026",
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
  selectedEmployeeId?: string | null;
  onSelectEmployee?: (employeeId: string) => void;
  onClearSelection?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [payBasis, setPayBasis] = useState("all");
  const [attendanceInput, setAttendanceInput] = useState("all");
  const [page, setPage] = useState(1);
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

  useEffect(() => setPage(1), [query, payBasis, attendanceInput]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const first = filtered.length === 0 ? 0 : start + 1;
  const last = Math.min(start + PAGE_SIZE, filtered.length);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const selectedAttendance = selectedEmployee
    ? attendanceByEmployee.get(selectedEmployee.id)
    : undefined;
  const selectedAdjustments = selectedEmployee
    ? adjustments.filter((adjustment) => adjustment.employeeId === selectedEmployee.id)
    : [];
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
        <label className="review-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search employees</span>
          <input
            aria-label="Search employees"
            placeholder="Search name or employee ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {runStatus === "draft" && (
          <>
            <label>
              <span>Pay basis</span>
              <select
                aria-label="Pay basis"
                value={payBasis}
                onChange={(event) => setPayBasis(event.target.value)}
              >
                <option value="all">All pay bases</option>
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
              </select>
            </label>
            <label>
              <span>Attendance input</span>
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
            </label>
          </>
        )}
      </div>

      <div className={`payroll-review-layout${selectedEmployee ? " has-selection" : ""}`}>
        <div className="payroll-review-list">
          <div className="review-head">
            <span>Employee</span>
            <span>{runStatus === "finalised" ? "Gross pay" : "Pay basis"}</span>
            <span>{runStatus === "finalised" ? "Deductions" : "Attendance input"}</span>
            <span>{runStatus === "finalised" ? "Net pay" : "Policy"}</span>
          </div>
          {visible.length ? (
            visible.map((employee) => {
              const input = attendanceByEmployee.get(employee.id);
              const result = resultByEmployee.get(employee.id);
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
              <span data-label={runStatus === "finalised" ? "Net pay" : "Policy"}>
                <strong>{runStatus === "finalised" ? money(result?.netPaySen) : policyName}</strong>
                <small>{runStatus === "finalised" ? "Published payslip" : "EPF · SOCSO · EIS"}</small>
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

          <div className="payroll-pagination">
            <p>
              Showing {first}–{last} of {filtered.length}{" "}
              {filtered.length === 1 ? "employee" : "employees"}
            </p>
            <nav aria-label="Employee pay review pages">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft size={15} /> Previous
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    className={pageNumber === currentPage ? "active" : ""}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage === pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Next <ChevronRight size={15} />
              </button>
            </nav>
          </div>
        </div>
        {selectedEmployee && (
          <aside
            className="payroll-review-inspector"
            role="region"
            aria-label={`${selectedEmployee.fullName} payroll detail`}
          >
            <div className="payroll-inspector-head">
              <button type="button" className="inspector-back" onClick={onClearSelection}>
                <ChevronLeft size={16} /> Back to employees
              </button>
              <button type="button" className="icon-button" aria-label="Close employee detail" onClick={onClearSelection}>
                <X size={17} />
              </button>
            </div>
            <div className="payroll-inspector-person person">
              <i>{initials(selectedEmployee.fullName)}</i>
              <span><strong>{selectedEmployee.fullName}</strong><small>{selectedEmployee.employeeCode}</small></span>
            </div>
            {runStatus === "finalised" && selectedResult ? (
              <>
                <p className="inspector-kicker">Stored finalised result</p>
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
                <p className="inspector-kicker">Draft calculation inputs</p>
                <dl className="payroll-inspector-values">
                  <div><dt>Pay basis</dt><dd>{selectedEmployee.salaryType}</dd></div>
                  <div><dt>Current rate</dt><dd>{selectedEmployee.salaryType === "monthly" ? money(selectedEmployee.monthlySalarySen) : `${money(selectedEmployee.hourlyRateSen)}/hr`}</dd></div>
                  <div><dt>Worked time</dt><dd>{selectedAttendance?.workedMinutes ?? 0} min</dd></div>
                  <div><dt>Overtime</dt><dd>{selectedAttendance?.overtimeMinutes ?? 0} min</dd></div>
                  <div className="wide"><dt>Statutory policy</dt><dd>{policyName}<small>EPF · SOCSO · EIS</small></dd></div>
                </dl>
                <div className="payroll-input-adjustments">
                  <h3>Adjustments</h3>
                  {selectedAdjustments.length ? selectedAdjustments.map((adjustment, index) => (
                    <div key={`${adjustment.description}-${index}`}><span><strong>{adjustment.description}</strong><small>{adjustment.type}</small></span><b>{money(adjustment.amountSen)}</b></div>
                  )) : <p>No adjustments for this employee.</p>}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
