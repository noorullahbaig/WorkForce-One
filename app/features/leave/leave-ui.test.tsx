// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, test } from "vitest";
import { AdminLeaveWorkspace, EmployeeLeaveWorkspace } from "./leave-ui";

afterEach(cleanup);

const balances = [
  {
    employeeId: "emp-001",
    leaveTypeId: "leave-annual",
    name: "Annual leave",
    paid: 1,
    allocatedHalfDays: 28,
    adjustmentHalfDays: 0,
    approvedHalfDays: 2,
    pendingHalfDays: 1,
  },
];

const holidays = [
  {
    id: "holiday-national",
    name: "National Day",
    date: "2026-08-31",
    category: "public" as const,
    region: "MY-PENANG",
    observed: 0,
    active: 1,
  },
];

function renderRoute(element: React.ReactNode, path: string) {
  const router = createMemoryRouter([{ path: "*", element }], {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} />);
}

describe("employee leave workspace", () => {
  test("shows shared names and holidays without exposing coworker leave details", () => {
    renderRoute(
      <EmployeeLeaveWorkspace
        employeeId="emp-001"
        ownRecords={[]}
        sharedRecords={[
          {
            id: "lr-2",
            employeeId: "emp-007",
            fullName: "Mei Ling Wong",
            department: "People",
            startDate: "2026-08-25",
            endDate: "2026-08-26",
          },
        ]}
        balances={balances}
        holidays={holidays}
      />,
	      "/employee/leave?month=2026-08&date=2026-08-26",
    );

    expect(
      screen.getByRole("grid", { name: "August 2026 shared leave calendar" }),
    ).not.toBeNull();
    expect(screen.getAllByText("Mei Ling Wong")).toHaveLength(3);
    expect(screen.getByText("National Day")).not.toBeNull();
    expect(screen.queryByText(/medical|annual leave · mei/i)).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Wednesday, 26 August" }),
    ).not.toBeNull();
  });

  test("presents projected balance and a half-day request control", () => {
    renderRoute(
      <EmployeeLeaveWorkspace
        employeeId="emp-001"
        ownRecords={[]}
        sharedRecords={[]}
        balances={balances}
        holidays={holidays}
      />,
      "/employee/leave?month=2026-08&request=new&date=2026-08-28",
    );
    expect(screen.getByText("12.5 days projected")).not.toBeNull();
    expect(screen.getByRole("combobox", { name: "Duration" })).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Submit leave request" }),
    ).not.toBeNull();
    expect(screen.getByLabelText("From")).toHaveValue("2026-08-28");
    expect(screen.getByLabelText("To")).toHaveValue("2026-08-28");
  });

  test("keeps the current date marked after another date is selected", async () => {
    const user = userEvent.setup();
    renderRoute(
      <EmployeeLeaveWorkspace
        employeeId="emp-001"
        ownRecords={[]}
        sharedRecords={[]}
        balances={balances}
        holidays={holidays}
        today="2026-08-27"
      />,
      "/employee/leave?month=2026-08&date=2026-08-28",
    );

    await user.click(
      within(
        screen.getByRole("gridcell", { name: "Saturday, 29 August" }),
      ).getByRole("link", { name: "29" }),
    );
    expect(
      within(
        screen.getByRole("gridcell", { name: "Thursday, 27 August" }),
      ).getByRole("link", { name: "27" }),
    ).toHaveAttribute("aria-current", "date");
    expect(
      screen.getByRole("heading", { name: "Saturday, 29 August" }),
    ).not.toBeNull();
  });

  test("updates the request dates when the calendar selection changes", async () => {
    const user = userEvent.setup();
    renderRoute(
      <EmployeeLeaveWorkspace
        employeeId="emp-001"
        ownRecords={[]}
        sharedRecords={[]}
        balances={balances}
        holidays={holidays}
        today="2026-08-27"
        backdateDays={3}
      />,
      "/employee/leave?month=2026-08&request=new&date=2026-08-28",
    );

    await user.click(
      within(
        screen.getByRole("gridcell", { name: "Saturday, 29 August" }),
      ).getByRole("link", { name: "29" }),
    );
    expect(screen.getByRole("complementary", { name: "Request leave" })).not.toBeNull();
    expect(screen.getByLabelText("From")).toHaveValue("2026-08-29");
    expect(screen.getByLabelText("To")).toHaveValue("2026-08-29");
  });

  test("blocks requests earlier than the configured backdate window", async () => {
    const user = userEvent.setup();
    renderRoute(
      <EmployeeLeaveWorkspace
        employeeId="emp-001"
        ownRecords={[]}
        sharedRecords={[]}
        balances={balances}
        holidays={holidays}
        today="2026-08-27"
        backdateDays={3}
      />,
      "/employee/leave?month=2026-08&request=new&date=2026-08-27",
    );

    const from = screen.getByLabelText("From");
    expect(from).toHaveAttribute("min", "2026-08-24");
    await user.clear(from);
    await user.type(from, "2026-08-23");
    expect(screen.getByRole("button", { name: "Submit leave request" })).toBeDisabled();
    expect(screen.getByText("Leave cannot start before 24 August 2026.")).not.toBeNull();
  });

  test("previews working duration, excluded days, and balance impact", async () => {
    const user = userEvent.setup();
    renderRoute(
      <EmployeeLeaveWorkspace
        employeeId="emp-001"
        ownRecords={[]}
        sharedRecords={[]}
        balances={balances}
        holidays={holidays}
      />,
      "/employee/leave?month=2026-08&request=new&date=2026-08-28",
    );
    await user.clear(screen.getByLabelText("To"));
    await user.type(screen.getByLabelText("To"), "2026-09-01");
    expect(screen.getByText("2 working days")).not.toBeNull();
    expect(screen.getByText("3 non-working days excluded")).not.toBeNull();
    expect(screen.getByText("10.5 days after this request")).not.toBeNull();
  });

  test("moves through dates with calendar arrow keys", async () => {
    const user = userEvent.setup();
    renderRoute(
      <EmployeeLeaveWorkspace
        employeeId="emp-001"
        ownRecords={[]}
        sharedRecords={[]}
        balances={balances}
        holidays={holidays}
      />,
      "/employee/leave?month=2026-08&date=2026-08-26",
    );
    const selectedCell = screen.getByRole("gridcell", {
      name: "Wednesday, 26 August",
    });
    within(selectedCell).getByRole("link", { name: "26" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("heading", { name: "Thursday, 27 August" }),
    ).not.toBeNull();
  });
});

describe("admin leave workspace", () => {
  test("keeps the approval queue beside coverage context", () => {
    renderRoute(
      <AdminLeaveWorkspace
        records={[
          {
            id: "lr-1",
            employeeId: "emp-009",
            fullName: "Sarah Lim",
            department: "Sales",
            leaveTypeId: "leave-annual",
            typeName: "Annual leave",
            paid: 1,
            startDate: "2026-08-28",
            endDate: "2026-08-28",
            durationHalfDays: 2,
            dayPart: "full",
            reason: "Family appointment",
            status: "pending",
            createdAt: "2026-08-25T07:30:00.000Z",
            reviewedAt: null,
            reviewNote: null,
          },
        ]}
        employees={[
          { id: "emp-009", fullName: "Sarah Lim", department: "Sales" },
          { id: "emp-011", fullName: "Aina Noor", department: "Sales" },
        ]}
        holidays={holidays}
        balances={[
          ...balances,
          { ...balances[0], employeeId: "emp-009", pendingHalfDays: 2 },
        ]}
      />,
      "/admin/leave?month=2026-08&request=lr-1",
    );

    expect(
      screen.getByRole("heading", { name: "Approval queue" }),
    ).not.toBeNull();
    expect(screen.getByRole("combobox", { name: "Employee" })).not.toBeNull();
    expect(screen.getByRole("combobox", { name: "Events" })).not.toBeNull();
    expect(screen.getByRole("combobox", { name: "Status" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Requests" })).not.toBeNull();
    expect(
      screen.getByText("0 of 2 Sales employees already away"),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Approve request" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Reject request" }),
    ).not.toBeNull();
    expect(screen.getByText("12 days")).not.toBeNull();
  });
});
