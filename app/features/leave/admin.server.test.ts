import { afterEach, beforeEach, expect, test } from 'vitest';
import { testDatabase } from '../../../tests/helpers/database';
import { reviewLeave, cancelApprovedLeave, archiveHoliday, adjustLeaveBalance, saveHoliday } from './admin.server';
import type { DemoUser } from '../../services/auth.server';
let db:D1Database,dispose:()=>Promise<void>;
const admin:DemoUser={id:'user-admin',companyId:'company-merdeka',employeeId:null,name:'Admin',email:'admin@example.com',role:'admin'};
const now='2026-08-26T00:00:00.000Z';
beforeEach(async()=>{const f=await testDatabase();db=f.db;dispose=f.dispose;},30000);
afterEach(async()=>{await dispose();},30000);
function race(change:()=>Promise<unknown>):D1Database{return {prepare:db.prepare.bind(db),batch:async statements=>{await change();return db.batch(statements);}} as D1Database;}
async function count(action:string){return (await db.prepare("SELECT id FROM audit_events WHERE action=? AND id NOT LIKE 'audit-%'").bind(action).all()).results.length;}
test('rejects invalid decision enum and reason without changing pending request',async()=>{
 expect(await reviewLeave(db,admin,{id:'lr-001',decision:'forged',reviewNote:'bad'},now)).toHaveProperty('error');
 expect(await reviewLeave(db,admin,{id:'lr-001',decision:'rejected',reviewNote:' '},now)).toHaveProperty('error');
 expect(await db.prepare("SELECT status FROM leave_requests WHERE id='lr-001'").first()).toEqual({status:'pending'});
});
test('rejects foreign identities and non-admin actions',async()=>{
 await db.prepare("INSERT INTO companies SELECT 'other','Other','OTHER',timezone,created_at,updated_at,leave_backdate_days FROM companies LIMIT 1").run();
 const foreign={...admin,companyId:'other'};
 expect(await reviewLeave(db,foreign,{id:'lr-001',decision:'approved'},now)).toHaveProperty('error');
 expect(await cancelApprovedLeave(db,foreign,{id:'lr-002',reviewNote:'reason'},now)).toHaveProperty('error');
 expect(await adjustLeaveBalance(db,foreign,{employeeId:'emp-001',leaveTypeId:'leave-annual',deltaHalfDays:'2',reason:'reason'},now)).toHaveProperty('error');
 for(const fn of [reviewLeave,cancelApprovedLeave,archiveHoliday,adjustLeaveBalance])expect(await fn(db,{...admin,role:'employee'},{},now)).toHaveProperty('error');
});
test('review approval checks balance in the write and does not audit raced failure',async()=>{
 const wrapped=race(()=>db.prepare("UPDATE leave_balances SET allocated_half_days=0 WHERE employee_id='emp-009' AND leave_type_id='leave-annual'").run());
 expect(await reviewLeave(wrapped,admin,{id:'lr-001',decision:'approved'},now)).toHaveProperty('error');
 expect(await count('leave.approved')).toBe(0);
 expect(await db.prepare("SELECT status FROM leave_requests WHERE id='lr-001'").first()).toEqual({status:'pending'});
});
test('review and cancellation guard company ownership at write time',async()=>{
 const wrapped=race(()=>db.prepare("UPDATE employees SET company_id='other' WHERE id IN ('emp-009','emp-007')").run());
 await db.prepare("INSERT INTO companies SELECT 'other','Other','OTHER',timezone,created_at,updated_at,leave_backdate_days FROM companies LIMIT 1").run();
 expect(await reviewLeave(wrapped,admin,{id:'lr-001',decision:'approved'},now)).toHaveProperty('error');
 expect(await cancelApprovedLeave(wrapped,admin,{id:'lr-002',reviewNote:'reason'},now)).toHaveProperty('error');
 expect(await count('leave.approved')).toBe(0); expect(await count('leave.cancelled')).toBe(0);
});
test('reviews and cancels once with atomic audit and employee notification',async()=>{
 await db.prepare("UPDATE leave_requests SET employee_id='emp-001' WHERE id='lr-001'").run();
 expect(await reviewLeave(db,admin,{id:'lr-001',decision:'approved'},now)).toEqual({ok:'Leave request approved.'});
 expect(await reviewLeave(db,admin,{id:'lr-001',decision:'approved'},now)).toHaveProperty('error');
 expect(await count('leave.approved')).toBe(1);
 expect(await cancelApprovedLeave(db,admin,{id:'lr-001',reviewNote:'Changed plans'},now)).toEqual({ok:'Approved leave cancelled and balance restored.'});
 expect(await cancelApprovedLeave(db,admin,{id:'lr-001',reviewNote:'Changed plans'},now)).toHaveProperty('error');
 expect(await count('leave.cancelled')).toBe(1);
 expect((await db.prepare("SELECT title FROM notifications WHERE user_id='user-employee' AND title IN ('Leave request approved','Approved leave cancelled')").all()).results).toHaveLength(2);
});
test('balance adjustment prevents a raced negative projected balance',async()=>{
 const wrapped=race(()=>db.prepare("INSERT INTO leave_balance_adjustments VALUES ('race','emp-001','leave-annual',-28,'race','user-admin',?)").bind(now).run());
 expect(await adjustLeaveBalance(wrapped,admin,{employeeId:'emp-001',leaveTypeId:'leave-annual',deltaHalfDays:'-2',reason:'reason'},now)).toHaveProperty('error');
 expect(await count('leave.balance_adjusted')).toBe(0);
 expect((await db.prepare("SELECT id FROM leave_balance_adjustments WHERE id<>'race'").all()).results).toHaveLength(0);
});
test('balance adjustment obeys half-day limits and notifies once',async()=>{
 for(const deltaHalfDays of ['0','21','-21','0.5','bad'])expect(await adjustLeaveBalance(db,admin,{employeeId:'emp-001',leaveTypeId:'leave-annual',deltaHalfDays,reason:'reason'},now)).toHaveProperty('error');
 expect(await adjustLeaveBalance(db,admin,{employeeId:'emp-001',leaveTypeId:'leave-annual',deltaHalfDays:'2',reason:'Extra day'},now)).toEqual({ok:'Leave balance adjusted.'});
 expect(await count('leave.balance_adjusted')).toBe(1);
 expect((await db.prepare("SELECT id FROM notifications WHERE title='Leave balance updated'").all()).results).toHaveLength(1);
});
test('holiday archive guards future company scope and a raced leave overlap',async()=>{
 await db.prepare("INSERT INTO holidays VALUES ('custom-holiday','company-merdeka','Company Day','2026-09-03','company','MY-PENANG',0,NULL,1,?,?)").bind(now,now).run();
 const wrapped=race(()=>db.prepare("UPDATE leave_requests SET start_date='2026-09-03',end_date='2026-09-03' WHERE id='lr-001'").run());
 expect(await archiveHoliday(wrapped,admin,{id:'custom-holiday'},now)).toHaveProperty('error');
 expect(await count('holiday.archived')).toBe(0);
 await db.prepare("UPDATE leave_requests SET status='rejected' WHERE id='lr-001'").run();
 expect(await archiveHoliday(db,admin,{id:'custom-holiday'},now)).toEqual({ok:'Company holiday archived.'});
 expect(await archiveHoliday(db,admin,{id:'custom-holiday'},now)).toHaveProperty('error');
 expect(await count('holiday.archived')).toBe(1);
});
test('audit failure rolls back leave mutation',async()=>{
 await db.prepare("CREATE TRIGGER fail_leave_audit BEFORE INSERT ON audit_events WHEN NEW.action='leave.approved' BEGIN SELECT RAISE(ABORT,'audit failure'); END").run();
 await expect(reviewLeave(db,admin,{id:'lr-001',decision:'approved'},now)).rejects.toThrow();
 expect(await db.prepare("SELECT status FROM leave_requests WHERE id='lr-001'").first()).toEqual({status:'pending'});
});


test('holiday creation validates canonical future date and rejects a raced leave overlap',async()=>{
 expect(await saveHoliday(db,admin,{name:'Invalid',date:'2026-02-31'},now)).toHaveProperty('error');
 expect(await saveHoliday(db,admin,{name:'Past',date:'2026-08-25'},now)).toHaveProperty('error');
 const wrapped=race(()=>db.prepare("UPDATE leave_requests SET start_date='2026-09-04',end_date='2026-09-04' WHERE id='lr-001'").run());
 expect(await saveHoliday(wrapped,admin,{name:'Company Day',date:'2026-09-04'},now)).toEqual({error:'This date already affects a pending or approved leave request.'});
 expect(await db.prepare("SELECT id FROM holidays WHERE name='Company Day'").first()).toBeNull();
 expect(await count('holiday.created')).toBe(0);
});
test('concurrent duplicate holidays create exactly one record and audit',async()=>{
 const input={name:"Team's Day",date:'2026-09-04'};
 const results=await Promise.all([saveHoliday(db,admin,input,now),saveHoliday(db,admin,input,now)]);
 expect(results.filter(result=>'ok' in result)).toHaveLength(1);
 expect(results.filter(result=>'error' in result)).toHaveLength(1);
 expect((await db.prepare("SELECT id FROM holidays WHERE name=?").bind(input.name).all()).results).toHaveLength(1);
 expect(await count('holiday.created')).toBe(1);
});
