import type { DemoUser } from '../../services/auth.server';
import { isValidCalendarDate, todayInTimeZone } from '../../lib/date';

type Input = Record<string, FormDataEntryValue>;
type Result = {ok:string}|{error:string};
const value=(input:Input,key:string)=>typeof input[key]==='string'?input[key].trim():'';
const forbidden=()=>({error:'Only administrators can manage leave and company holidays.'});
function audit(db:D1Database,user:DemoUser,eventId:string,action:string,entityType:string,entityId:string,metadata:unknown,now:string){
 return db.prepare("INSERT INTO audit_events(id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,?,?,?,?,?,? WHERE changes()=1").bind(eventId,user.companyId,user.id,action,entityType,entityId,JSON.stringify(metadata),now);
}
function leaveNotification(db:D1Database,user:DemoUser,id:string,eventId:string,title:string,body:string,now:string){
 return db.prepare(`INSERT INTO notifications(id,user_id,title,body,href,created_at)
 SELECT lower(hex(randomblob(16))),u.id,?,?,'/employee/leave',? FROM users u JOIN leave_requests l ON l.employee_id=u.employee_id JOIN employees e ON e.id=l.employee_id
 WHERE l.id=? AND u.company_id=? AND e.company_id=? AND EXISTS(SELECT 1 FROM audit_events WHERE id=?)`).bind(title,body,now,id,user.companyId,user.companyId,eventId);
}
const ownedLeave="EXISTS(SELECT 1 FROM employees e JOIN leave_types t ON t.id=leave_requests.leave_type_id WHERE e.id=leave_requests.employee_id AND e.company_id=? AND t.company_id=?)";

export async function reviewLeave(db:D1Database,user:DemoUser,input:Input,now:string):Promise<Result>{
 if(user.role!=='admin')return forbidden();
 const id=value(input,'id'),decision=value(input,'decision'),note=value(input,'reviewNote');
 if(decision!=='approved'&&decision!=='rejected')return {error:'Choose a valid leave decision.'};
 if(decision==='rejected'&&!note)return {error:'Add a decision note before rejecting this request.'};
 const eventId=crypto.randomUUID();
 const results=await db.batch([
  db.prepare(`UPDATE leave_requests SET status=?,reviewed_by=?,reviewed_at=?,review_note=?,updated_at=? WHERE id=? AND status='pending' AND ${ownedLeave}
  AND (?='rejected' OR EXISTS(SELECT 1 FROM leave_types t WHERE t.id=leave_requests.leave_type_id AND t.company_id=? AND (t.paid=0 OR leave_requests.duration_half_days<=(SELECT b.allocated_half_days+COALESCE((SELECT SUM(a.delta_half_days) FROM leave_balance_adjustments a WHERE a.employee_id=b.employee_id AND a.leave_type_id=b.leave_type_id),0)-COALESCE((SELECT SUM(l.duration_half_days) FROM leave_requests l WHERE l.employee_id=b.employee_id AND l.leave_type_id=b.leave_type_id AND l.status='approved'),0) FROM leave_balances b WHERE b.employee_id=leave_requests.employee_id AND b.leave_type_id=leave_requests.leave_type_id))))`).bind(decision,user.id,now,note||null,now,id,user.companyId,user.companyId,decision,user.companyId),
  audit(db,user,eventId,`leave.${decision}`,'leave_request',id,{note:note||null},now),
  leaveNotification(db,user,id,eventId,decision==='approved'?'Leave request approved':'Leave request declined',decision==='approved'?'Your leave request has been approved.':`Your leave request was declined: ${note}`,now),
 ]);
 if(results[0].meta.changes)return {ok:`Leave request ${decision}.`};
 const record=await db.prepare(`SELECT status FROM leave_requests WHERE id=? AND ${ownedLeave}`).bind(id,user.companyId,user.companyId).first<{status:string}>();
 return {error:record?.status==='pending'&&decision==='approved'?'The employee no longer has enough leave balance for this request.':'This request has already been reviewed.'};
}

export async function cancelApprovedLeave(db:D1Database,user:DemoUser,input:Input,now:string):Promise<Result>{
 if(user.role!=='admin')return forbidden();
 const id=value(input,'id'),note=value(input,'reviewNote');
 if(!note)return {error:'Add a cancellation reason.'};
 const eventId=crypto.randomUUID();
 const results=await db.batch([
  db.prepare(`UPDATE leave_requests SET status='cancelled',cancelled_by=?,cancelled_at=?,review_note=?,updated_at=? WHERE id=? AND status='approved' AND ${ownedLeave}`).bind(user.id,now,note,now,id,user.companyId,user.companyId),
  audit(db,user,eventId,'leave.cancelled','leave_request',id,{reason:note},now),
  leaveNotification(db,user,id,eventId,'Approved leave cancelled',`An approved leave request was cancelled: ${note}`,now),
 ]);
 return results[0].meta.changes?{ok:'Approved leave cancelled and balance restored.'}:{error:'Only approved leave can be cancelled.'};
}

export async function archiveHoliday(db:D1Database,user:DemoUser,input:Input,now:string):Promise<Result>{
 if(user.role!=='admin')return forbidden();
 const company=await db.prepare('SELECT timezone FROM companies WHERE id=?').bind(user.companyId).first<{timezone:string}>();
 if(!company)return {error:'Company not found.'};
 const today=todayInTimeZone(new Date(now),company.timezone),id=value(input,'id'),eventId=crypto.randomUUID();
 const results=await db.batch([
  db.prepare(`UPDATE holidays SET active=0,updated_at=? WHERE id=? AND company_id=? AND category='company' AND active=1 AND date>?
  AND NOT EXISTS(SELECT 1 FROM leave_requests l JOIN employees e ON e.id=l.employee_id JOIN leave_types t ON t.id=l.leave_type_id WHERE e.company_id=holidays.company_id AND t.company_id=holidays.company_id AND l.status IN ('pending','approved') AND l.start_date<=holidays.date AND l.end_date>=holidays.date)`).bind(now,id,user.companyId,today),
  audit(db,user,eventId,'holiday.archived','holiday',id,{},now),
 ]);
 if(results[0].meta.changes)return {ok:'Company holiday archived.'};
 const holiday=await db.prepare("SELECT id FROM holidays WHERE id=? AND company_id=? AND category='company' AND active=1 AND date>?").bind(id,user.companyId,today).first();
 return {error:holiday?'This holiday affects an existing leave request and cannot be archived.':'Only future company holidays can be archived.'};
}

const projectedBalance=`b.allocated_half_days+COALESCE((SELECT SUM(a.delta_half_days) FROM leave_balance_adjustments a WHERE a.employee_id=b.employee_id AND a.leave_type_id=b.leave_type_id),0)-COALESCE((SELECT SUM(l.duration_half_days) FROM leave_requests l WHERE l.employee_id=b.employee_id AND l.leave_type_id=b.leave_type_id AND l.status IN ('approved','pending')),0)`;
export async function adjustLeaveBalance(db:D1Database,user:DemoUser,input:Input,now:string):Promise<Result>{
 if(user.role!=='admin')return forbidden();
 const employeeId=value(input,'employeeId'),leaveTypeId=value(input,'leaveTypeId'),reason=value(input,'reason'),deltaHalfDays=Number(value(input,'deltaHalfDays'));
 if(!reason||!Number.isInteger(deltaHalfDays)||deltaHalfDays===0||Math.abs(deltaHalfDays)>20)return {error:'Choose a valid adjustment and add a reason.'};
 const id=crypto.randomUUID(),eventId=crypto.randomUUID(),deltaDays=deltaHalfDays/2;
 const deltaFormatted=deltaDays>0?`+${deltaDays}`:`${deltaDays}`;
 const results=await db.batch([
  db.prepare(`INSERT INTO leave_balance_adjustments(id,employee_id,leave_type_id,delta_half_days,reason,actor_user_id,created_at)
  SELECT ?,b.employee_id,b.leave_type_id,?,?,?,? FROM leave_balances b JOIN employees e ON e.id=b.employee_id JOIN leave_types t ON t.id=b.leave_type_id WHERE b.employee_id=? AND b.leave_type_id=? AND e.company_id=? AND t.company_id=? AND (${projectedBalance})+?>=0`).bind(id,deltaHalfDays,reason,user.id,now,employeeId,leaveTypeId,user.companyId,user.companyId,deltaHalfDays),
  audit(db,user,eventId,'leave.balance_adjusted','leave_balance',`${employeeId}:${leaveTypeId}`,{deltaHalfDays,reason},now),
  db.prepare(`INSERT INTO notifications(id,user_id,title,body,href,created_at)
  SELECT lower(hex(randomblob(16))),u.id,'Leave balance updated','Your '||t.name||' balance was adjusted by '||?||' ('||?||'). New balance: '||printf('%g',(${projectedBalance})/2.0)||CASE WHEN (${projectedBalance})=2 THEN ' day.' ELSE ' days.' END,'/employee/leave',?
  FROM users u JOIN employees e ON e.id=u.employee_id JOIN leave_balances b ON b.employee_id=e.id JOIN leave_types t ON t.id=b.leave_type_id WHERE b.employee_id=? AND b.leave_type_id=? AND u.company_id=? AND e.company_id=? AND t.company_id=? AND EXISTS(SELECT 1 FROM audit_events WHERE id=?)`).bind(`${deltaFormatted} ${Math.abs(deltaDays)===1?'day':'days'}`,reason,now,employeeId,leaveTypeId,user.companyId,user.companyId,user.companyId,eventId),
 ]);
 if(results[0].meta.changes)return {ok:'Leave balance adjusted.'};
 const balance=await db.prepare('SELECT b.employee_id FROM leave_balances b JOIN employees e ON e.id=b.employee_id JOIN leave_types t ON t.id=b.leave_type_id WHERE b.employee_id=? AND b.leave_type_id=? AND e.company_id=? AND t.company_id=?').bind(employeeId,leaveTypeId,user.companyId,user.companyId).first();
 return {error:balance?'This adjustment would make the projected balance negative.':'Leave balance not found.'};
}


export async function saveHoliday(db:D1Database,user:DemoUser,input:Input,now:string):Promise<Result>{
 if(user.role!=='admin')return forbidden();
 const name=value(input,'name'),holidayDate=value(input,'date');
 if(!name||!isValidCalendarDate(holidayDate))return {error:'Add a future holiday date and name.'};
 const company=await db.prepare('SELECT timezone FROM companies WHERE id=?').bind(user.companyId).first<{timezone:string}>();
 if(!company)return {error:'Company not found.'};
 if(holidayDate<=todayInTimeZone(new Date(now),company.timezone))return {error:'Add a future holiday date and name.'};
 const id=crypto.randomUUID(),eventId=crypto.randomUUID();
 const results=await db.batch([
  db.prepare(`INSERT INTO holidays(id,company_id,name,date,category,region,observed,active,created_at,updated_at)
  SELECT ?,c.id,?,?,'company','MY-PENANG',0,1,?,? FROM companies c WHERE c.id=? AND NOT EXISTS(SELECT 1 FROM leave_requests l JOIN employees e ON e.id=l.employee_id JOIN leave_types t ON t.id=l.leave_type_id WHERE e.company_id=c.id AND t.company_id=c.id AND l.status IN ('pending','approved') AND l.start_date<=? AND l.end_date>=?)
  ON CONFLICT(company_id,date,name) DO NOTHING`).bind(id,name,holidayDate,now,now,user.companyId,holidayDate,holidayDate),
  audit(db,user,eventId,'holiday.created','holiday',id,{name,date:holidayDate},now),
 ]);
 if(results[0].meta.changes)return {ok:'Company holiday added.'};
 const overlap=await db.prepare("SELECT l.id FROM leave_requests l JOIN employees e ON e.id=l.employee_id JOIN leave_types t ON t.id=l.leave_type_id WHERE e.company_id=? AND t.company_id=? AND l.status IN ('pending','approved') AND l.start_date<=? AND l.end_date>=? LIMIT 1").bind(user.companyId,user.companyId,holidayDate,holidayDate).first();
 return {error:overlap?'This date already affects a pending or approved leave request.':'A holiday with this name already exists on that date.'};
}
