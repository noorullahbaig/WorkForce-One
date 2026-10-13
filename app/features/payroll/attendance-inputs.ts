import { allocateDailyAttendance } from "../../domain/attendance";
export type AttendanceInput = {
  employeeId: string;
  workDate: string;
  workedMinutes: number | null;
  overtimeMinutes: number | null;
};
export function aggregateAttendance(
  records: AttendanceInput[],
  start: string,
  end: string,
) {
  const totals = new Map<
    string,
    {
      employeeId: string;
      regularMinutes: number;
      workedMinutes: number;
      overtimeMinutes: number;
    }
  >();
  for (const r of allocateDailyAttendance(records)) {
    if (r.workDate < start || r.workDate > end) continue;
    const t = totals.get(r.employeeId) ?? {
      employeeId: r.employeeId,
      regularMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
    };
    t.regularMinutes += (r.workedMinutes ?? 0) - (r.overtimeMinutes ?? 0);
    t.workedMinutes += r.workedMinutes ?? 0;
    t.overtimeMinutes += r.overtimeMinutes ?? 0;
    totals.set(r.employeeId, t);
  }
  return [...totals.values()];
}
