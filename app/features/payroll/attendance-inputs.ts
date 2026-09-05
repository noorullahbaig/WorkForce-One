import { NORMAL_DAY_MINUTES } from "../../domain/attendance";
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
  for (const r of records) {
    if (r.workDate < start || r.workDate > end) continue;
    const t = totals.get(r.employeeId) ?? {
      employeeId: r.employeeId,
      regularMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
    };
    t.regularMinutes += Math.min(r.workedMinutes ?? 0, NORMAL_DAY_MINUTES);
    t.workedMinutes += r.workedMinutes ?? 0;
    t.overtimeMinutes += r.overtimeMinutes ?? 0;
    totals.set(r.employeeId, t);
  }
  return [...totals.values()];
}
