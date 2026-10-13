import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest';
import {RouterContextProvider} from 'react-router';
import {testDatabase} from '../../tests/helpers/database';
import {action} from './portal';
import {cloudflareContext} from '../context';
import {createSession} from '../services/auth.server';
let f:Awaited<ReturnType<typeof testDatabase>>;let db:D1Database;
beforeAll(async()=>{f=await testDatabase();db=f.db;await db.prepare("INSERT INTO companies(id,name,registration_number,timezone,created_at,updated_at) VALUES('portal-b','Company B','B','Asia/Kuala_Lumpur','2026-01-01','2026-01-01')").run()},30000);afterAll(async()=>{await f?.dispose()});
beforeEach(async()=>{await db.prepare("UPDATE users SET company_id='company-merdeka' WHERE id='user-admin'").run()});
async function invoke(path:string,input:Record<string,string>,userId='user-admin',database=db,demo='true'){
 const cookie=(await createSession(userId,{DB:db} as Env)).split(';')[0];const context=new RouterContextProvider();context.set(cloudflareContext,{env:{DB:database,DEMO_MODE:demo} as Env,ctx:{} as ExecutionContext});
 return action({request:new Request('https://audit.test'+path,{method:'POST',headers:{Cookie:cookie,Origin:'https://audit.test'},body:new URLSearchParams(input)}),params:{},context} as unknown as Parameters<typeof action>[0]);
}
it('rejects reset outside seeded company and when demo mode is off',async()=>{await db.prepare("UPDATE users SET company_id='portal-b' WHERE id='user-admin'").run();expect(await invoke('/admin',{intent:'reset-demo'})).toHaveProperty('error');await db.prepare("UPDATE users SET company_id='company-merdeka' WHERE id='user-admin'").run();expect(await invoke('/admin',{intent:'reset-demo'},'user-admin',db,'false')).toHaveProperty('error')});
it('wires conditional company status guard and company-scoped policy creation',async()=>{await db.prepare("UPDATE users SET company_id='portal-b' WHERE id='user-admin'").run();expect(await invoke('/admin/employees/emp-001',{intent:'toggle-employee-status',employeeId:'emp-001',status:'inactive'})).toHaveProperty('error');expect(await db.prepare("SELECT status FROM employees WHERE id='emp-001'").first()).toMatchObject({status:'active'});expect(await invoke('/admin/payroll/policies',{intent:'clone-policy',name:'B policy',workdayHours:'8',overtimeMultiplier:'1.5'})).toHaveProperty('ok');expect(await db.prepare("SELECT company_id FROM payroll_policies WHERE name='B policy'").first()).toMatchObject({company_id:'portal-b'})});
it('rejects malformed self profile through the portal with field errors and no write',async()=>{const old=await db.prepare("SELECT email,phone FROM employees WHERE id='emp-001'").first();const result=await invoke('/employee/profile',{intent:'update-self-profile',email:'invalid',phone:'invalid'},'user-employee');expect(result).toHaveProperty('fieldErrors');expect(await db.prepare("SELECT email,phone FROM employees WHERE id='emp-001'").first()).toEqual(old)});
it('rejects impossible holiday dates through integrated admin action',async()=>{expect(await invoke('/admin/leave/holidays',{intent:'save-holiday',name:'Impossible',date:'2027-02-30'})).toHaveProperty('error');expect(await db.prepare("SELECT id FROM holidays WHERE name='Impossible'").first()).toBeNull()});
it('rejects leave if holiday calendar changed after duration calculation',async()=>{
 const wrapped={prepare:(sql:string)=>{
  const prepared=db.prepare(sql);if(!sql.includes('INSERT INTO leave_requests'))return prepared;
  return {bind:(...values:unknown[])=>{const bound=prepared.bind(...values);return {first:async()=>{await db.prepare("INSERT INTO holidays(id,company_id,name,date,category,region,observed,active,created_at,updated_at) VALUES('race-holiday','company-merdeka','Race','2027-04-01','company','MY-PENANG',0,1,'2026-01-01','2026-01-01')").run();return bound.first()}}}}
 },batch:db.batch.bind(db)} as D1Database;
 expect(await invoke('/employee/leave',{intent:'apply-leave',leaveTypeId:'leave-annual',startDate:'2027-04-01',endDate:'2027-04-01',dayPart:'full',reason:'Race'},'user-employee',wrapped)).toHaveProperty('error');expect(await db.prepare("SELECT id FROM leave_requests WHERE reason='Race'").first()).toBeNull();
});
