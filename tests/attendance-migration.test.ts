import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {testDatabase} from './helpers/database';
import {attendanceConflicts} from '../app/domain/attendance';
it('rehearses allocation migration without deleting legacy rows or changing finalised payroll',async()=>{const f=await testDatabase();try{
 const db=f.db;const before=(await db.prepare("SELECT * FROM payroll_results WHERE payroll_run_id='payroll-2026-07'").all()).results;
 for(const [id,start,out]of [['migration-a','01:00','06:00'],['migration-b','07:00','12:00']])await db.prepare("INSERT INTO attendance_records(id,employee_id,work_date,clock_in,clock_out,worked_minutes,overtime_minutes,status,created_at,updated_at) VALUES(?,'emp-001','2027-01-01',?,?,300,0,'present','2027-01-01','2027-01-01')").bind(id,`2027-01-01T${start}:00Z`,`2027-01-01T${out}:00Z`).run();
 for(const id of ['legacy-a','legacy-b'])await db.prepare("INSERT INTO attendance_records(id,employee_id,work_date,clock_in,status,created_at,updated_at) VALUES(?,'emp-001','2027-01-02','2027-01-02T01:00:00Z','missing_clock_out','2027-01-02','2027-01-02')").bind(id).run();
 const count=await db.prepare('SELECT count(*) n FROM attendance_records').first();await db.prepare(readFileSync('drizzle/migrations/0006_attendance_daily_allocation.sql','utf8')).run();
 expect(await db.prepare('SELECT count(*) n FROM attendance_records').first()).toEqual(count);
 expect(await db.prepare("SELECT sum(worked_minutes) worked,sum(overtime_minutes) overtime FROM attendance_records WHERE id LIKE 'migration-%'").first()).toMatchObject({worked:600,overtime:120});
 expect((await db.prepare("SELECT * FROM payroll_results WHERE payroll_run_id='payroll-2026-07'").all()).results).toEqual(before);
 const legacy=(await db.prepare("SELECT id,employee_id employeeId,work_date workDate,clock_in clockIn,clock_out clockOut,worked_minutes workedMinutes,overtime_minutes overtimeMinutes FROM attendance_records WHERE id LIKE 'legacy-%'").all<{id:string;employeeId:string;workDate:string;clockIn:string;clockOut:null;workedMinutes:null;overtimeMinutes:null}>()).results;
 expect(legacy).toHaveLength(2);expect(attendanceConflicts(legacy)).toEqual(['legacy-b']);
 }finally{await f.dispose()}},30000);
