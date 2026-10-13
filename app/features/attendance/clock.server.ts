import {calculateAttendance,NORMAL_DAY_MINUTES} from '../../domain/attendance';
import {time} from '../../lib/format';
import {toUtc} from './corrections';
import {reallocateDay} from './allocation.server';
import type {DemoUser} from '../../services/auth.server';
// Bound the unknown interval of historical gaps; they remain exceptions but do not block new work indefinitely.
const activeSql="clock_in IS NOT NULL AND clock_out IS NULL AND julianday(clock_in)<=julianday(?) AND julianday(clock_in)>=julianday(?,'-1 day')";
export async function attendanceClockAction(env:Env,user:DemoUser,intent:string,data:Record<string,FormDataEntryValue>,today:string,now:string){
 if(!Number.isFinite(Date.parse(now)))return {error:'Choose a valid attendance timestamp.'};
 const db=env.DB;
 if(intent==='employee-clock'&&user.role==='employee'&&user.employeeId){
  const owned=await db.prepare('SELECT id FROM employees WHERE id=? AND company_id=?').bind(user.employeeId,user.companyId).first();if(!owned)return {error:'Employee not found.'};
  const actionType=String(data.actionType??'');if(!['clock-in','clock-out','reset'].includes(actionType))return {error:'Choose a valid clock action.'};const method=data.method==='qr'?'qr':'fingerprint';
  if(actionType==='reset'){
   const deleted=await db.batch([db.prepare('DELETE FROM attendance_records WHERE employee_id=? AND work_date=? AND NOT EXISTS(SELECT 1 FROM attendance_correction_requests WHERE employee_id=? AND work_date=?) AND EXISTS(SELECT 1 FROM employees e WHERE e.id=attendance_records.employee_id AND e.company_id=?)').bind(user.employeeId,today,user.employeeId,today,user.companyId),reallocateDay(db,user.employeeId,today,now,'changes()>0')]);
   return deleted[0].meta.changes?{ok:"Today's shift records reset. Ready to clock in."}:{error:'Cannot reset attendance linked to correction requests, or there are no records to reset.'};
  }
  const open=await db.prepare(`SELECT id,clock_in clockIn,work_date workDate FROM attendance_records WHERE employee_id=? AND ${activeSql} ORDER BY julianday(clock_in) DESC,id LIMIT 1`).bind(user.employeeId,now,now).first<{id:string;clockIn:string;workDate:string}>();
  if(actionType==='clock-out'){
   if(!open)return {error:'No active shift found. Request a correction for an older missing clock-out.'};
   let result;try{result=calculateAttendance({clockIn:open.clockIn,clockOut:now,normalDayMinutes:NORMAL_DAY_MINUTES})}catch(error){return {error:error instanceof Error?error.message:'Choose a valid clock-out time.'}}
   const changed=await db.batch([db.prepare("UPDATE attendance_records SET clock_out=?,clock_out_method=?,worked_minutes=?,overtime_minutes=?,status='present',updated_at=? WHERE id=? AND clock_out IS NULL AND clock_in=? AND EXISTS(SELECT 1 FROM employees e WHERE e.id=attendance_records.employee_id AND e.company_id=?)").bind(now,method,result.workedMinutes,result.overtimeMinutes,now,open.id,open.clockIn,user.companyId),reallocateDay(db,user.employeeId,open.workDate,now,'changes()=1')]);
   return changed[0].meta.changes?{ok:`Clocked out successfully via ${method==='qr'?'QR Code':'Fingerprint'} · ${(result.workedMinutes!/60).toFixed(1)} hours worked.`}:{error:'Attendance changed while clocking out. Refresh and check the record.'};
  }
  const inserted=await db.prepare(`INSERT INTO attendance_records(id,employee_id,work_date,clock_in,clock_in_method,status,created_at,updated_at)
 SELECT ?,?,?,?,?,'missing_clock_out',?,? WHERE NOT EXISTS(SELECT 1 FROM attendance_records WHERE employee_id=? AND ${activeSql}) AND NOT EXISTS(SELECT 1 FROM attendance_records WHERE employee_id=? AND clock_out IS NOT NULL AND julianday(clock_in)<=julianday(?) AND julianday(clock_out)>julianday(?)) AND EXISTS(SELECT 1 FROM employees WHERE id=? AND company_id=?)`).bind(crypto.randomUUID(),user.employeeId,today,now,method,now,now,user.employeeId,now,now,user.employeeId,now,now,user.employeeId,user.companyId).run();
  return inserted.meta.changes?{ok:`Clocked in successfully via ${method==='qr'?'QR Code':'Fingerprint'} at ${time(now)}.`}:{error:'An active or overlapping shift already exists. Refresh and check your attendance.'};
 }
 if(intent==='simulate-attendance'&&user.role==='admin'){
  const employeeId=String(data.employeeId??'');const method=data.method==='fingerprint'?'fingerprint':'qr';const employee=await db.prepare('SELECT id FROM employees WHERE id=? AND company_id=?').bind(employeeId,user.companyId).first();if(!employee)return {error:'Employee not found.'};
  const existing=await db.prepare("SELECT id,work_date workDate,clock_in clockIn FROM attendance_records WHERE employee_id=? AND clock_in IS NOT NULL AND clock_out IS NULL ORDER BY julianday(clock_in),id LIMIT 1").bind(employeeId).first<{id:string;workDate:string;clockIn:string}>();
  if(existing){
   let out:string,result;try{
    const baseline=`${existing.workDate}T10:15:00.000Z`;
    out=data.clockOut?toUtc(String(data.clockOut)):(Date.parse(baseline)>Date.parse(existing.clockIn)?baseline:new Date(Date.parse(existing.clockIn)+8*3600_000).toISOString());
    if(Date.parse(out)>Date.parse(now))return {error:'Clock-out time cannot be in the future.'};
    result=calculateAttendance({clockIn:existing.clockIn,clockOut:out,normalDayMinutes:NORMAL_DAY_MINUTES});
   }catch(error){return {error:error instanceof Error?error.message:'Choose a valid Malaysia clock-out time.'}}
   const changed=await db.batch([db.prepare("UPDATE attendance_records SET clock_out=?,clock_out_method=?,worked_minutes=?,overtime_minutes=?,status='present',updated_at=? WHERE id=? AND clock_out IS NULL AND clock_in=? AND EXISTS(SELECT 1 FROM employees e WHERE e.id=attendance_records.employee_id AND e.company_id=?) AND NOT EXISTS(SELECT 1 FROM attendance_records s WHERE s.employee_id=attendance_records.employee_id AND s.id!=attendance_records.id AND s.clock_in IS NOT NULL AND julianday(s.clock_in)<julianday(?) AND COALESCE(julianday(s.clock_out),julianday(s.clock_in)+1)>julianday(?))").bind(out,method,result.workedMinutes,result.overtimeMinutes,now,existing.id,existing.clockIn,user.companyId,out,existing.clockIn),reallocateDay(db,employeeId,existing.workDate,now,'changes()=1')]);
   return changed[0].meta.changes?{ok:`Clock-out captured · ${result.workedMinutes!/60} hours worked.`}:{error:'Attendance changed while clocking out. Refresh and check the record.'};
  }
  const arrival=`${today}T01:00:00.000Z`;if(Date.parse(arrival)>Date.parse(now))return {error:'The demo 09:00 clock-in is in the future. Try capture after 09:00 Malaysia time.'};
  const inserted=await db.prepare(`INSERT INTO attendance_records(id,employee_id,work_date,clock_in,clock_in_method,status,created_at,updated_at) SELECT ?,?,?,?,?,'missing_clock_out',?,? WHERE NOT EXISTS(SELECT 1 FROM attendance_records WHERE employee_id=? AND ${activeSql}) AND NOT EXISTS(SELECT 1 FROM attendance_records WHERE employee_id=? AND clock_in IS NOT NULL AND julianday(clock_in)<=julianday(?) AND COALESCE(julianday(clock_out),julianday(clock_in)+1)>julianday(?)) AND EXISTS(SELECT 1 FROM employees WHERE id=? AND company_id=?)`).bind(crypto.randomUUID(),employeeId,today,arrival,method,now,now,employeeId,now,now,employeeId,arrival,arrival,employeeId,user.companyId).run();
  return inserted.meta.changes?{ok:'Clock-in captured at 9:00 AM MYT.'}:{error:'An active or overlapping shift already exists.'};
 }
 return {error:'Attendance action unavailable.'};
}
