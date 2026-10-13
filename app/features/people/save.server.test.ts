import { afterEach, beforeEach, expect, test } from "vitest";
import { testDatabase } from "../../../tests/helpers/database";
import { saveEmployeeProfile, updateSelfProfile } from "./save.server";
import type { DemoUser } from "../../services/auth.server";

let db: D1Database, dispose: () => Promise<void>;
const admin: DemoUser = {id:'user-admin',companyId:'company-merdeka',employeeId:null,name:'Admin',email:'admin@example.com',role:'admin'};
const employee: DemoUser = {...admin,id:'user-employee',employeeId:'emp-001',role:'employee'};
const now='2026-08-27T00:00:00.000Z';
const valid = {employeeId:'emp-001',fullName:'Farah Updated',employeeCode:'MC-1001',email:' farah@example.com ',phone:'+60 (12) 301-7782',department:'Operations',position:'Manager',employmentType:'full_time',salaryType:'monthly',rateRm:'6500.01',startDate:'2022-03-14',bankAccountNumber:'0012-3456'};
beforeEach(async () => { const fixture=await testDatabase(); db=fixture.db; dispose=fixture.dispose; });
afterEach(async () => { await dispose(); });
test.each([{startDate:'2026-02-31'},{email:'invalid'},{phone:'123'},{bankAccountNumber:'abc'},{employmentType:'other'},{salaryType:'other'},{fullName:' '},{rateRm:'-1'}])('rejects invalid employee input %j without partial writes', async invalid => {
 const before=await db.prepare('SELECT * FROM employees WHERE id=?').bind('emp-001').first();
 expect(await saveEmployeeProfile(db,admin,{...valid,...invalid},now)).toHaveProperty('error');
 expect(await db.prepare('SELECT * FROM employees WHERE id=?').bind('emp-001').first()).toEqual(before);
 expect((await db.prepare("SELECT id FROM audit_events WHERE action='employee.saved'").all()).results).toHaveLength(0);
});
test('rejects non-admin and unknown/foreign IDs without success or audit', async () => {
 expect(await saveEmployeeProfile(db,employee,valid,now)).toHaveProperty('error');
 expect(await saveEmployeeProfile(db,admin,{...valid,employeeId:'missing'},now)).toHaveProperty('error');
 await db.prepare("INSERT INTO companies SELECT 'other','Other','OTHER',timezone,created_at,updated_at,leave_backdate_days FROM companies LIMIT 1").run();
 await db.prepare("UPDATE employees SET company_id='other' WHERE id='emp-001'").run();
 expect(await saveEmployeeProfile(db,admin,valid,now)).toHaveProperty('error');
 expect(await updateSelfProfile(db,employee,valid,now)).toHaveProperty('error');
 expect((await db.prepare("SELECT id FROM audit_events WHERE action IN ('employee.saved','employee.self_update')").all()).results).toHaveLength(0);
});
test('saves normalized contacts and leading zeros, ignores posted company and audits atomically', async () => {
 expect(await saveEmployeeProfile(db,admin,{...valid,companyId:'forged'},now)).toHaveProperty('ok');
 expect(await db.prepare("SELECT company_id,email,bank_account_number,monthly_salary_sen FROM employees WHERE id='emp-001'").first()).toEqual({company_id:'company-merdeka',email:'farah@example.com',bank_account_number:'00123456',monthly_salary_sen:650001});
 expect((await db.prepare("SELECT id FROM audit_events WHERE action='employee.saved'").all()).results).toHaveLength(1);
});
test('creates a new employee in the current company', async () => {
 expect(await saveEmployeeProfile(db,admin,{...valid,employeeId:'',employeeCode:'NEW-1'},now)).toHaveProperty('ok');
 const row=await db.prepare("SELECT id,company_id FROM employees WHERE employee_code='NEW-1'").first<{id:string;company_id:string}>();
 expect(row?.id).toMatch(/^custom-/); expect(row?.company_id).toBe(admin.companyId);
});
test('self update touches only own record and rejects invalid contacts', async () => {
 expect(await updateSelfProfile(db,employee,{...valid,email:'invalid'},now)).toHaveProperty('fieldErrors.email');
 expect(await updateSelfProfile(db,employee,{...valid,employeeId:'emp-002'},now)).toHaveProperty('ok');
 expect(await db.prepare("SELECT email,bank_account_number FROM employees WHERE id='emp-001'").first()).toEqual({email:'farah@example.com',bank_account_number:'00123456'});
 expect(await db.prepare("SELECT email FROM employees WHERE id='emp-002'").first()).toEqual({email:'amir@merdekacoffee.demo'});
});
test('audit failure rolls back employee update', async () => {
 await db.prepare("CREATE TRIGGER reject_profile_audit BEFORE INSERT ON audit_events WHEN NEW.action='employee.saved' BEGIN SELECT RAISE(ABORT,'Audit unavailable'); END").run();
 await expect(saveEmployeeProfile(db,admin,valid,now)).rejects.toThrow();
 expect(await db.prepare("SELECT full_name FROM employees WHERE id='emp-001'").first()).toEqual({full_name:'Farah Iskandar'});
});
