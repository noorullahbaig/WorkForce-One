import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest';
import {testDatabase} from '../../../tests/helpers/database';
import {attendanceClockAction} from './clock.server';
import type {DemoUser} from '../../services/auth.server';
const user:DemoUser={id:'user-employee',employeeId:'emp-001',companyId:'company-merdeka',role:'employee',name:'Farah',email:'employee@workforceone.demo'};
let fixture:Awaited<ReturnType<typeof testDatabase>>, db:D1Database;
beforeAll(async()=>{fixture=await testDatabase();db=fixture.db},30000);afterAll(async()=>{await fixture?.dispose()});
beforeEach(async()=>{await db.prepare("DELETE FROM attendance_records WHERE employee_id='emp-001'").run()});
const clock=(actionType:string,now:string,today=now.slice(0,10))=>attendanceClockAction({DB:db} as Env,user,'employee-clock',{actionType,method:'qr'},today,now);
it('atomically prevents simultaneous clock-ins but permits completed split shifts',async()=>{const rs=await Promise.all([clock('clock-in','2027-02-01T01:00:00Z'),clock('clock-in','2027-02-01T01:00:00Z')]);expect(rs.filter(r=>'ok'in r)).toHaveLength(1);expect((await db.prepare("SELECT count(*) n FROM attendance_records WHERE employee_id='emp-001'").first<{n:number}>())?.n).toBe(1);await clock('clock-out','2027-02-01T06:00:00Z');expect(await clock('clock-in','2027-02-01T07:00:00Z')).toHaveProperty('ok');await clock('clock-out','2027-02-01T12:00:00Z');expect((await db.prepare("SELECT sum(worked_minutes) worked,sum(overtime_minutes) ot FROM attendance_records WHERE employee_id='emp-001'").first())).toMatchObject({worked:600,ot:120})});
it('closes overnight shift on its original work date',async()=>{await clock('clock-in','2027-02-03T14:00:00Z','2027-02-03');expect(await clock('clock-out','2027-02-03T22:00:00Z','2027-02-04')).toHaveProperty('ok');expect(await db.prepare("SELECT work_date,worked_minutes FROM attendance_records WHERE employee_id='emp-001'").first()).toMatchObject({work_date:'2027-02-03',worked_minutes:480})});
it('allows exactly24h but prompts correction for older gaps without blocking new work',async()=>{await clock('clock-in','2027-02-01T01:00:00Z');expect(await clock('clock-out','2027-02-02T01:00:00Z')).toHaveProperty('ok');await clock('clock-in','2027-02-03T01:00:00Z');expect(await clock('clock-out','2027-02-04T01:00:01Z')).toHaveProperty('error');expect(await clock('clock-in','2027-02-04T01:00:01Z')).toHaveProperty('ok')});
it('rejects equal/reversed/invalid timestamps with a controlled result',async()=>{const now='2027-02-01T01:00:00Z';await clock('clock-in',now);await expect(clock('clock-out',now)).resolves.toHaveProperty('error');await expect(clock('clock-out','2027-02-01T00:00:00Z')).resolves.toHaveProperty('error');await expect(clock('clock-out','not-a-date')).resolves.toHaveProperty('error')});
it('concurrent clock-outs complete one record once',async()=>{await clock('clock-in','2027-02-01T01:00:00Z');const rs=await Promise.all([clock('clock-out','2027-02-01T10:00:00Z'),clock('clock-out','2027-02-01T10:00:00Z')]);expect(rs.filter(r=>'ok'in r)).toHaveLength(1);expect(await db.prepare("SELECT worked_minutes,overtime_minutes FROM attendance_records WHERE employee_id='emp-001'").first()).toMatchObject({worked_minutes:540,overtime_minutes:60})});
it('validates explicit Malaysia admin departure and safely defaults late-start shifts',async()=>{await clock('clock-in','2027-02-01T12:00:00Z');const admin={...user,id:'user-admin',role:'admin' as const,employeeId:null};const capture=(clockOut:string)=>attendanceClockAction({DB:db} as Env,admin,'simulate-attendance',{employeeId:'emp-001',method:'qr',clockOut},'2027-02-02','2027-02-02T10:00:00Z');expect(await capture('2027-02-01T18:15')).toHaveProperty('error');expect(await capture('2027-02-02T04:00')).toHaveProperty('ok');expect(await db.prepare("SELECT worked_minutes FROM attendance_records WHERE employee_id='emp-001'").first()).toMatchObject({worked_minutes:480})});
it('admin capture cannot recreate a completed 09:00 shift',async()=>{
 const admin={...user,id:'user-admin',role:'admin' as const,employeeId:null};
 await clock('clock-in','2027-02-01T01:00:00Z');await clock('clock-out','2027-02-01T10:15:00Z');
 expect(await attendanceClockAction({DB:db} as Env,admin,'simulate-attendance',{employeeId:'emp-001'},'2027-02-01','2027-02-01T11:00:00Z')).toHaveProperty('error');
 expect(await db.prepare("SELECT count(*) n FROM attendance_records WHERE employee_id='emp-001'").first()).toMatchObject({n:1});
});
it('admin explicit closure cannot overlap a later completed session',async()=>{
 await clock('clock-in','2027-02-01T01:00:00Z');await clock('clock-in','2027-02-03T01:00:00Z');await clock('clock-out','2027-02-03T09:00:00Z');
 const admin={...user,id:'user-admin',role:'admin' as const,employeeId:null};
 expect(await attendanceClockAction({DB:db} as Env,admin,'simulate-attendance',{employeeId:'emp-001',clockOut:'2027-02-03T18:00'},'2027-02-03','2027-02-03T11:00:00Z')).toHaveProperty('error');
 expect(await db.prepare("SELECT clock_out FROM attendance_records WHERE employee_id='emp-001' AND work_date='2027-02-01'").first()).toMatchObject({clock_out:null});
});
it.each(['employee-in','employee-out','employee-reset','admin-in','admin-out'])('rechecks company ownership atomically for %s',async operation=>{
 await db.prepare("INSERT OR IGNORE INTO companies(id,name,registration_number,timezone,created_at,updated_at) VALUES ('clock-other','Other','OTHER','Asia/Kuala_Lumpur','now','now')").run();
 if(operation.endsWith('out')||operation.endsWith('reset'))await clock('clock-in','2027-02-01T01:00:00Z');
 const wrapped={batch:db.batch.bind(db),prepare:(sql:string)=>{
   const original=db.prepare(sql);
   if(!sql.startsWith('SELECT id FROM employees'))return original;
   return {bind:(...values:unknown[])=>{
     const bound=original.bind(...values);
     return {first:async()=>{const row=await bound.first();if(sql.startsWith('SELECT id FROM employees'))await db.prepare("UPDATE employees SET company_id='clock-other' WHERE id='emp-001'").run();return row},run:bound.run.bind(bound),all:bound.all.bind(bound)};
   }};
 }} as D1Database;
 try {
   const admin={...user,id:'user-admin',role:'admin' as const,employeeId:null};
   const result=operation.startsWith('admin')?await attendanceClockAction({DB:wrapped} as Env,admin,'simulate-attendance',{employeeId:'emp-001'},'2027-02-01','2027-02-01T11:00:00Z'):await attendanceClockAction({DB:wrapped} as Env,user,'employee-clock',{actionType:operation==='employee-in'?'clock-in':operation==='employee-out'?'clock-out':'reset'},'2027-02-01','2027-02-01T11:00:00Z');
   expect(result).toHaveProperty('error');
   expect(await db.prepare("SELECT count(*) n FROM attendance_records WHERE employee_id='emp-001'").first()).toMatchObject({n:operation.endsWith('out')||operation.endsWith('reset')?1:0});
   if(operation.endsWith('out'))expect(await db.prepare("SELECT clock_out FROM attendance_records WHERE employee_id='emp-001'").first()).toMatchObject({clock_out:null});
 } finally {await db.prepare("UPDATE employees SET company_id='company-merdeka' WHERE id='emp-001'").run()}
});
