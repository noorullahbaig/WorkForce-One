import {it,expect} from 'vitest';
import {testDatabase} from '../../../tests/helpers/database';
import {attendanceClockAction} from './clock.server';
import {addCalendarDays,todayInTimeZone} from '../../lib/date';
import type {DemoUser} from '../../services/auth.server';
const employee:DemoUser={id:'user-employee',employeeId:'emp-001',companyId:'company-merdeka',role:'employee',name:'Farah',email:'employee@workforceone.demo'};
it('runs thirty deterministic employee workdays against disposable D1',async()=>{const f=await testDatabase();try{for(let i=0;i<30;i++){const d=addCalendarDays('2027-03-01',i);for(const [actionType,hour]of [['clock-in','01'],['clock-out','10']])expect(await attendanceClockAction({DB:f.db} as Env,employee,'employee-clock',{actionType,method:i%2?'qr':'fingerprint'},d,`${d}T${hour}:00:00Z`)).toHaveProperty('ok')}
 expect(await f.db.prepare("SELECT count(*) n,sum(worked_minutes) worked,sum(overtime_minutes) overtime FROM attendance_records WHERE employee_id='emp-001' AND work_date BETWEEN '2027-03-01' AND '2027-03-30'").first()).toMatchObject({n:30,worked:16200,overtime:1800});
 }finally{await f.dispose()}},30000);
it.each(['2027-02-28','2027-12-31','2028-02-29'])('completes overnight shift across boundary %s on original workdate',async(day)=>{const f=await testDatabase();try{for(const [actionType,now]of [['clock-in',`${day}T14:00:00Z`],['clock-out',`${day}T22:00:00Z`]])expect(await attendanceClockAction({DB:f.db} as Env,employee,'employee-clock',{actionType,method:'qr'},todayInTimeZone(new Date(now),'Asia/Kuala_Lumpur'),now)).toHaveProperty('ok');expect(await f.db.prepare('SELECT work_date,worked_minutes FROM attendance_records WHERE employee_id=? AND work_date=?').bind('emp-001',day).first()).toMatchObject({work_date:day,worked_minutes:480})}finally{await f.dispose()}},30000);
