import { expect, it } from "vitest";
import { aggregateAttendance } from "./attendance-inputs";
it("aggregates only the selected period with existing per-record overtime rules", () => {
  const rows = [
    {
      employeeId: "e",
      workDate: "2026-08-01",
      workedMinutes: 600,
      overtimeMinutes: 120,
    },
    {
      employeeId: "e",
      workDate: "2026-08-02",
      workedMinutes: 120,
      overtimeMinutes: 0,
    },
    {
      employeeId: "e",
      workDate: "2026-07-31",
      workedMinutes: 480,
      overtimeMinutes: 0,
    },
  ];
  expect(aggregateAttendance(rows, "2026-08-01", "2026-08-31")).toEqual([
    {
      employeeId: "e",
      regularMinutes: 600,
      workedMinutes: 720,
      overtimeMinutes: 120,
    },
  ]);
});
