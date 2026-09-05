import { ChevronLeft, ChevronRight, Search } from "lucide-react";
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

const PAGE_SIZE = 10;

export function PayrollEmployeeReview({
  employees,
  attendance,
}: {
  employees: PayrollReviewEmployee[];
  attendance: PayrollAttendanceInput[];
}) {
  const [query, setQuery] = useState("");
  const [payBasis, setPayBasis] = useState("all");
  const [attendanceInput, setAttendanceInput] = useState("all");
  const [page, setPage] = useState(1);
  const attendanceByEmployee = useMemo(
    () => new Map(attendance.map((item) => [item.employeeId, item])),
    [attendance],
  );
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return employees.filter((employee) => {
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
  }, [attendanceByEmployee, attendanceInput, employees, payBasis, query]);

  useEffect(() => setPage(1), [query, payBasis, attendanceInput]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const first = filtered.length === 0 ? 0 : start + 1;
  const last = Math.min(start + PAGE_SIZE, filtered.length);

  return (
    <section className="surface payroll-review" aria-labelledby="employee-pay-review-title">
      <div className="payroll-review-title">
        <div>
          <p className="eyebrow">Payroll inputs</p>
          <h2 id="employee-pay-review-title">Employee pay review</h2>
          <p>Review attendance and pay inputs before finalising payroll.</p>
        </div>
        <span className="review-state">Ready for review</span>
      </div>

      <div className="payroll-review-toolbar">
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
      </div>

      <div className="review-head">
        <span>Employee</span>
        <span>Pay basis</span>
        <span>Attendance input</span>
        <span>Policy</span>
      </div>
      {visible.length ? (
        visible.map((employee) => {
          const input = attendanceByEmployee.get(employee.id);
          return (
            <div className="review-row" key={employee.id}>
              <span className="person">
                <i>{initials(employee.fullName)}</i>
                <span>
                  <strong>{employee.fullName}</strong>
                  <small>{employee.employeeCode}</small>
                </span>
              </span>
              <span>
                <strong>
                  {employee.salaryType === "monthly"
                    ? money(employee.monthlySalarySen)
                    : `${money(employee.hourlyRateSen)}/hr`}
                </strong>
                <small>{employee.salaryType}</small>
              </span>
              <span>
                <strong>
                  {(input?.workedMinutes ?? 0) > 0
                    ? `${input?.workedMinutes} min`
                    : employee.salaryType === "monthly"
                      ? "Monthly base"
                      : "No hours"}
                </strong>
                <small>{input?.overtimeMinutes ?? 0} OT min</small>
              </span>
              <span>
                <strong>MY Standard 2026</strong>
                <small>EPF · SOCSO · EIS</small>
              </span>
            </div>
          );
        })
      ) : (
        <div className="payroll-review-empty">
          <strong>No matching employees</strong>
          <span>Adjust your search or filters to see payroll inputs.</span>
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
    </section>
  );
}
