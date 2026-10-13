import {
  calculateAttendance,
  NORMAL_DAY_MINUTES,
  ACTIVE_SHIFT_MILLISECONDS,
  allocateDailyAttendance,
} from "../../domain/attendance";
import { todayInTimeZone } from "../../lib/date";

export type CorrectionSource = {
  id: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
};
export type Session = {
  workDate?:string;
  workedMinutes?:number|null;
  id: string;
  clockIn: string | null;
  clockOut: string | null;
};
export function malaysiaInput(value: string | null): string {
  return value
    ? new Date(Date.parse(value) + 8 * 3600_000).toISOString().slice(0, 19)
    : "";
}
export function toUtc(value: string, original?: string | null): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value))
    throw new Error("Choose a valid Malaysia date and time.");
  const parsed = new Date(`${value}+08:00`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    malaysiaInput(parsed.toISOString()) !==
      (value.length === 16 ? `${value}:00` : value)
  )
    throw new Error("Choose a valid Malaysia date and time.");
  return original &&
    malaysiaInput(original) === malaysiaInput(parsed.toISOString())
    ? original
    : parsed.toISOString();
}
export function validateCorrection(
  record: CorrectionSource,
  clockIn: string,
  clockOut: string,
  reason: string,
  sessions: Session[],
  now = new Date().toISOString(),
) {
  if (record.status === "on_leave")
    throw new Error("Attendance corrections cannot override leave records.");
  if (!reason.trim() || reason.trim().length > 2000)
    throw new Error("Enter a reason of 1–2000 characters.");
  if (
    !clockIn ||
    !clockOut ||
    !Number.isFinite(Date.parse(clockIn)) ||
    !Number.isFinite(Date.parse(clockOut))
  )
    throw new Error("Provide both valid clock times.");
  if (
    Date.parse(clockIn) > Date.parse(now) ||
    Date.parse(clockOut) > Date.parse(now)
  )
    throw new Error("Clock times cannot be in the future.");
  if (
    todayInTimeZone(new Date(clockIn), "Asia/Kuala_Lumpur") !== record.workDate
  )
    throw new Error("Clock in must remain on the original work date.");
  if (
    Date.parse(clockIn) === Date.parse(record.clockIn ?? "") &&
    Date.parse(clockOut) === Date.parse(record.clockOut ?? "")
  )
    throw new Error("Change at least one clock time.");
  calculateAttendance({
    clockIn,
    clockOut,
    normalDayMinutes: NORMAL_DAY_MINUTES,
  });
  if (
    sessions.some(
      (s) =>
        s.id !== record.id &&
        s.clockIn &&
        Date.parse(s.clockIn) < Date.parse(clockOut) &&
        Date.parse(s.clockOut ?? new Date(Date.parse(s.clockIn) + ACTIVE_SHIFT_MILLISECONDS).toISOString()) > Date.parse(clockIn),
    )
  )
    throw new Error("The proposed times overlap another attendance session.");
  return correctionPreview(record,clockIn,clockOut,sessions);
}
export function correctionPreview(record:CorrectionSource,clockIn:string,clockOut:string,sessions:Session[]){
 const result=calculateAttendance({clockIn,clockOut,normalDayMinutes:NORMAL_DAY_MINUTES});
  const proposed = {id:record.id,clockIn,clockOut,workDate:record.workDate,workedMinutes:result.workedMinutes};
  const daySessions=[...sessions.filter(s=>s.id!==record.id),proposed].filter(s=>s.clockIn && (s.workDate??todayInTimeZone(new Date(s.clockIn),'Asia/Kuala_Lumpur'))===record.workDate).map(s=>({...s,employeeId:'preview',workDate:record.workDate,workedMinutes:s.workedMinutes!==undefined?s.workedMinutes:s.clockIn&&s.clockOut?calculateAttendance({clockIn:s.clockIn,clockOut:s.clockOut,normalDayMinutes:NORMAL_DAY_MINUTES}).workedMinutes:null,overtimeMinutes:null as number|null}));
  return {...result,overtimeMinutes:allocateDailyAttendance(daySessions).find(s=>s.id===record.id)?.overtimeMinutes ?? result.overtimeMinutes};
}
