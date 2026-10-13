// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it } from "vitest";
import { CorrectionForm,AdminCorrections } from "./correction-ui";
import type { Attendance,CorrectionRequest } from "./types";
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

it('admin previews daily overtime across the employee sibling sessions',()=>{
 const second={...record,id:'b',clockIn:'2026-08-25T06:00:00Z',clockOut:'2026-08-25T10:00:00Z',workedMinutes:240,overtimeMinutes:60,status:'present'};
 const first={...record,id:'first',clockIn:'2026-08-25T00:00:00Z',clockOut:'2026-08-25T05:00:00Z',workedMinutes:300,overtimeMinutes:0,status:'present'};
 const request:CorrectionRequest={id:'r',companyId:'company-merdeka',employeeId:record.employeeId,attendanceId:'b',requestedBy:'user-employee',fullName:'Farah',employeeCode:'MC-1',salaryType:'hourly',workDate:record.workDate,originalClockIn:second.clockIn,originalClockOut:second.clockOut,originalClockInMethod:'qr',originalClockOutMethod:'qr',originalStatus:'present',originalWorkedMinutes:240,originalOvertimeMinutes:60,originalUpdatedAt:record.updatedAt,proposedClockIn:second.clockIn,proposedClockOut:'2026-08-25T11:00:00Z',reason:'Later departure',status:'pending',reviewedBy:null,reviewedAt:null,rejectionReason:null,createdAt:record.updatedAt,stale:0,currentClockIn:second.clockIn,currentClockOut:second.clockOut};
 render(<RouterProvider router={createMemoryRouter([{path:'/',element:<AdminCorrections requests={[request]} periods={[]} attendance={[first,second]}/>}],{initialEntries:['/?request=r']})}/>);
 expect(screen.getByText(/2h 0m overtime/)).toBeVisible();
});
