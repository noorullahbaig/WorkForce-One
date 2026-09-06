// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { EmployeeForm, type EmployeeFormRecord } from "./employee-form";

const employee: EmployeeFormRecord = {
  id: "emp-001",
  employeeCode: "MC-1001",
  fullName: "Farah Iskandar",
  email: "farah@example.com",
  phone: "+60123456789",
  department: "Operations",
  position: "Barista",
  employmentType: "full_time",
  salaryType: "monthly",
  monthlySalarySen: 320000,
  hourlyRateSen: null,
  startDate: "2026-01-01",
  status: "active",
  icNumber: null,
  epfNumber: null,
  taxNumber: null,
  bankName: "Maybank",
  bankAccountNumber: null,
};

function renderForm(props: Partial<React.ComponentProps<typeof EmployeeForm>> = {}) {
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <EmployeeForm
          open
          onClose={vi.fn()}
          {...props}
        />
      ),
    },
  ]);
  return { ...render(<RouterProvider router={router} />), router };
}

afterEach(cleanup);

describe("EmployeeForm", () => {
  test("renders a focused add form with the existing save intent", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: "Add an employee" })).toHaveFocus();
    expect(screen.getByDisplayValue("MC-1011")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add employee" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("save-employee")).toHaveValue("save-employee");
  });

  test("renders edit values and closes through the inspector control", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderForm({ employee, onClose });

    expect(screen.getByRole("heading", { name: "Edit employee profile" })).toHaveFocus();
    expect(screen.getByDisplayValue("Farah Iskandar")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close employee form" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
