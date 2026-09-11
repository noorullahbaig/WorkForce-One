// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { PayrollEmployeeReview } from "./payroll-employee-review";

afterEach(cleanup);

function renderWithRouter(element: React.ReactElement, initialPath = "/") {
  const router = createMemoryRouter([{ path: "*", element }], { initialEntries: [initialPath] });
  return render(<RouterProvider router={router} />);
}

const employees = Array.from({ length: 23 }, (_, index) => ({
  id: `employee-${index + 1}`,
  employeeCode: `MC-${String(index + 1).padStart(4, "0")}`,
  fullName: `Employee ${String(index + 1).padStart(2, "0")}`,
  salaryType: (index % 2 ? "hourly" : "monthly") as "monthly" | "hourly",
  monthlySalarySen: index % 2 ? null : 500_000,
  hourlyRateSen: index % 2 ? 1_800 : null,
}));

const attendance = employees.map((employee, index) => ({
  employeeId: employee.id,
  workedMinutes: index === 4 ? 0 : 480 + index,
  overtimeMinutes: index % 5 === 0 ? 30 : 0,
}));

describe("PayrollEmployeeReview", () => {
  test("renders all employee rows for continuous scrolling review", () => {
    render(<PayrollEmployeeReview employees={employees} attendance={attendance} />);

    expect(screen.getByRole("heading", { name: "Employee pay review" })).toBeVisible();
    expect(screen.getByText("23 employees")).toBeVisible();
    expect(screen.getByText("Employee 01")).toBeVisible();
    expect(screen.getByText("Employee 23")).toBeVisible();
    expect(employees).toHaveLength(23);
  });

  test("searches and filters the review list with instant counts", async () => {
    const user = userEvent.setup();
    render(<PayrollEmployeeReview employees={employees} attendance={attendance} />);

    await user.type(screen.getByLabelText("Search employees"), "MC-0023");
    expect(screen.getByText("Showing 1 of 23")).toBeVisible();
    expect(screen.getByText("Employee 23")).toBeVisible();

    await user.clear(screen.getByLabelText("Search employees"));
    await user.selectOptions(screen.getByLabelText("Pay basis"), "hourly");
    expect(screen.getByText("Showing 11 of 23")).toBeVisible();
    expect(screen.queryByText("Employee 01")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Attendance input"), "overtime");
    expect(screen.getByText("Showing 2 of 23")).toBeVisible();
    expect(screen.getByText("Employee 06")).toBeVisible();
    expect(screen.getByText("Employee 16")).toBeVisible();
  });

  test("opens a selected employee with complete draft inputs", async () => {
    const user = userEvent.setup();
    const onSelectEmployee = vi.fn();
    const { rerender } = render(
      <PayrollEmployeeReview
        employees={employees}
        attendance={attendance}
        adjustments={[{ employeeId: "employee-1", type: "allowance", description: "Travel", amountSen: 12500 }]}
        onSelectEmployee={onSelectEmployee}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Review Employee 01/ }));
    expect(onSelectEmployee).toHaveBeenCalledWith("employee-1");

    rerender(
      <PayrollEmployeeReview
        employees={employees}
        attendance={attendance}
        adjustments={[{ employeeId: "employee-1", type: "allowance", description: "Travel", amountSen: 12500 }]}
        selectedEmployeeId="employee-1"
        onSelectEmployee={onSelectEmployee}
      />,
    );
    const inspector = screen.getByRole("region", { name: "Employee 01 payroll detail" });
    expect(inspector).toHaveTextContent("MY Standard 2026");
    expect(inspector).toHaveTextContent("480 min");
    expect(inspector).toHaveTextContent("Travel");
    expect(inspector).toHaveTextContent("+RM 125.00");
    expect(inspector).toHaveTextContent("Allowance");
    expect(inspector).toHaveTextContent("Net impact (1 item)");
  });

  test("renders deduction adjustments with negative sign, deduction pill, and net impact", () => {
    renderWithRouter(
      <PayrollEmployeeReview
        employees={employees}
        attendance={attendance}
        adjustments={[
          { id: "adj-1", employeeId: "employee-1", type: "deduction", description: "Uniform replacement", amountSen: 3500 },
        ]}
        selectedEmployeeId="employee-1"
      />,
    );

    const inspector = screen.getByRole("region", { name: "Employee 01 payroll detail" });
    expect(inspector).toHaveTextContent("Uniform replacement");
    expect(inspector).toHaveTextContent("-RM 35.00");
    expect(inspector).toHaveTextContent("Deduction");
    expect(inspector).toHaveTextContent("Net impact (1 item)");
    expect(screen.getByRole("button", { name: "Delete Uniform replacement" })).toBeInTheDocument();
  });

  test("uses stored results for finalised employee financial detail", () => {
    render(
      <PayrollEmployeeReview
        employees={employees}
        attendance={attendance}
        runStatus="finalised"
        selectedEmployeeId="employee-1"
        storedResults={[{
          employeeId: "employee-1",
          grossPaySen: 612300,
          totalDeductionsSen: 73100,
          netPaySen: 539200,
          breakdownJson: JSON.stringify({ basePaySen: 500000, overtimePaySen: 12000, allowanceSen: 100300, epfEmployeeSen: 55000, socsoEmployeeSen: 12000, eisEmployeeSen: 1100, pcbSen: 5000 }),
        }]}
      />,
    );

    const inspector = screen.getByRole("region", { name: "Employee 01 payroll detail" });
    expect(screen.getByRole("button", { name: /Review Employee 01/ })).toHaveTextContent(/RM\s5,392\.00/);
    expect(screen.queryByRole("button", { name: /Review Employee 02/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Pay basis")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Attendance input")).not.toBeInTheDocument();
    expect(screen.getByText("1 employee")).toBeVisible();
    expect(inspector).toHaveTextContent(/RM\s5,392\.00/);
    expect(inspector).toHaveTextContent(/RM\s6,123\.00/);
    expect(inspector).toHaveTextContent("Stored finalised result");
  });
});
