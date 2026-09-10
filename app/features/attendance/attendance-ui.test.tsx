// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, test } from "vitest";
import { AttendancePage, EmployeeAttendance } from "./attendance-ui";

afterEach(cleanup);

const record = {
  id: "attendance-1",
  employeeId: "employee-1",
  fullName: "Farah Iskandar",
  employeeCode: "MC-1001",
  workDate: "2026-09-08",
  clockIn: "2026-09-08T01:00:00.000Z",
  clockOut: "2026-09-08T10:00:00.000Z",
  clockInMethod: "fingerprint",
  clockOutMethod: "qr",
  workedMinutes: 540,
  overtimeMinutes: 60,
  status: "complete",
  updatedAt: "2026-09-08T10:00:00.000Z",
};

function renderRoute(element: React.ReactNode) {
  return render(
    <RouterProvider
      router={createMemoryRouter([{ path: "*", element }], { initialEntries: ["/admin/attendance"] })}
    />,
  );
}

describe("attendance UI", () => {
  test("gives the administrator list a named scroll owner and labeled mobile values", () => {
    renderRoute(<AttendancePage records={[record]} corrections={[]} />);

    expect(screen.getByRole("region", { name: "Attendance results" })).toHaveClass("scrollable-region");
    expect(screen.getByText("Tue, 8 Sept")).toHaveAttribute("data-label", "Date");
    expect(screen.getByText("9h 0m")).toHaveAttribute("data-label", "Worked");
  });

  test("announces the selected employee clock method", async () => {
    const user = userEvent.setup();
    renderRoute(
      <EmployeeAttendance
        records={[]}
        corrections={[]}
        employee={{ id: "employee-1", fullName: "Farah Iskandar", employeeCode: "MC-1001" }}
        today="2026-09-08"
      />,
    );

    const fingerprint = screen.getByRole("button", { name: "Fingerprint" });
    const qr = screen.getByRole("button", { name: "QR Code" });
    expect(fingerprint).toHaveAttribute("aria-pressed", "true");
    expect(qr).toHaveAttribute("aria-pressed", "false");
    await user.click(qr);
    expect(qr).toHaveAttribute("aria-pressed", "true");
  });
});
