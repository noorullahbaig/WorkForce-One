// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it } from "vitest";
import { CorrectionForm } from "./correction-ui";
import type { Attendance } from "./types";
afterEach(cleanup);
const record: Attendance = {
  id: "a",
  employeeId: "e",
  fullName: "Farah",
  employeeCode: "MC-1",
  workDate: "2026-08-25",
  clockIn: "2026-08-25T01:00:00.000Z",
  clockOut: null,
  clockInMethod: "qr",
  clockOutMethod: null,
  workedMinutes: null,
  overtimeMinutes: null,
  status: "missing_clock_out",
  updatedAt: "2026-08-25T01:00:00Z",
};
it("shows original values and previews worked/overtime before submitting", async () => {
  const user = userEvent.setup();
  render(
    <RouterProvider
      router={createMemoryRouter([
        {
          path: "/",
          element: <CorrectionForm record={record} records={[record]} />,
        },
      ])}
    />,
  );
  expect(screen.getByText("Original record")).toBeVisible();
  await user.type(
    screen.getByLabelText("Reason for correction"),
    "Forgot clock-out",
  );
  await user.type(
    screen.getByLabelText("Proposed clock out (Malaysia time)"),
    "2026-08-25T18:30",
  );
  expect(screen.getByText(/9h 30m worked/)).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Submit correction request" }),
  ).toBeEnabled();
});
