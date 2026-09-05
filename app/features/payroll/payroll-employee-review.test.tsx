// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import { PayrollEmployeeReview } from "./payroll-employee-review";

afterEach(cleanup);

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
  test("paginates employee rows ten at a time without changing the source collection", async () => {
    const user = userEvent.setup();
    render(<PayrollEmployeeReview employees={employees} attendance={attendance} />);

    expect(screen.getByRole("heading", { name: "Employee pay review" })).toBeVisible();
    expect(screen.getByText("Showing 1–10 of 23 employees")).toBeVisible();
    expect(screen.getByText("Employee 10")).toBeVisible();
    expect(screen.queryByText("Employee 11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getByText("Showing 11–20 of 23 employees")).toBeVisible();
    expect(screen.getByText("Employee 11")).toBeVisible();
    expect(employees).toHaveLength(23);
  });

  test("searches and filters the review and returns to the first page", async () => {
    const user = userEvent.setup();
    render(<PayrollEmployeeReview employees={employees} attendance={attendance} />);

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    await user.type(screen.getByLabelText("Search employees"), "MC-0023");
    expect(screen.getByText("Showing 1–1 of 1 employee")).toBeVisible();
    expect(screen.getByText("Employee 23")).toBeVisible();

    await user.clear(screen.getByLabelText("Search employees"));
    await user.selectOptions(screen.getByLabelText("Pay basis"), "hourly");
    expect(screen.getByText("Showing 1–10 of 11 employees")).toBeVisible();
    expect(screen.queryByText("Employee 01")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Attendance input"), "overtime");
    expect(screen.getByText("Showing 1–2 of 2 employees")).toBeVisible();
    expect(screen.getByText("Employee 06")).toBeVisible();
    expect(screen.getByText("Employee 16")).toBeVisible();
  });
});
