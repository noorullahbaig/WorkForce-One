import { parseProfile } from "../../domain/profile";
import { isValidCalendarDate } from "../../lib/date";
import type { DemoUser } from "../../services/auth.server";

type Input = Record<string, FormDataEntryValue>;
export type ProfileSaveResult = { ok: string } | { error: string; fieldErrors?: Record<string, string> };
const text = (input: Input, key: string) => typeof input[key] === "string" ? input[key].trim() : "";

function audit(db: D1Database, user: DemoUser, employeeId: string, action: string, now: string) {
 // changes() observes the immediately preceding mutation in the same D1 transaction.
 return db.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,?,?,'employee',?,'{}',? WHERE changes()=1").bind(crypto.randomUUID(), user.companyId, user.id, action, employeeId, now);
}

export async function saveEmployeeProfile(db: D1Database, user: DemoUser, input: Input, now: string): Promise<ProfileSaveResult> {
 if (user.role !== "admin") return { error: "Only administrators can save employee profiles." };
 const parsed = parseProfile({email:input.email, phone:input.phone, bankName:input.bankName, bankAccountNumber:input.bankAccountNumber});
 const fieldErrors: Record<string, string> = parsed.success ? {} : {...parsed.fieldErrors};
 const required = ["fullName", "department", "position", "employeeCode"] as const;
 for (const key of required) if (!text(input,key)) fieldErrors[key] = "This field is required.";
 const startDate = text(input,"startDate");
 if (!isValidCalendarDate(startDate)) fieldErrors.startDate = "Choose a valid start date.";
 const employmentType = text(input,"employmentType");
 if (!["full_time", "part_time", "contract"].includes(employmentType)) fieldErrors.employmentType = "Choose a valid employment type.";
 const salaryType = text(input,"salaryType");
 if (!["monthly", "hourly"].includes(salaryType)) fieldErrors.salaryType = "Choose monthly or hourly pay.";
 const rate = text(input,"rateRm");
 const rateSen = Math.round(Number(rate) * 100);
 if (!/^\d+(\.\d{1,2})?$/.test(rate) || !Number.isSafeInteger(rateSen) || rateSen <= 0) fieldErrors.rateRm = "Enter a positive pay rate with at most two decimal places.";
 if (Object.keys(fieldErrors).length || !parsed.success) return {error:"Review the highlighted employee fields.",fieldErrors};
 const existingId = text(input,"employeeId");
 const employeeId = existingId || `custom-${crypto.randomUUID()}`;
 const duplicate = await db.prepare("SELECT id FROM employees WHERE company_id=? AND employee_code=? AND id<>?").bind(user.companyId,text(input,"employeeCode"),employeeId).first();
 if (duplicate) return {error:"That employee code is already in use.",fieldErrors:{employeeCode:"Choose a unique employee code."}};
 const profile = parsed.data;
 const values = [text(input,"employeeCode"),text(input,"fullName"),profile.email,profile.phone,text(input,"department"),text(input,"position"),employmentType,salaryType,salaryType === "monthly" ? rateSen : null,salaryType === "hourly" ? rateSen : null,startDate,text(input,"icNumber") || null,text(input,"epfNumber") || null,text(input,"taxNumber") || null,profile.bankName || null,profile.bankAccountNumber || null];
 const mutation = existingId
  ? db.prepare("UPDATE employees SET employee_code=?,full_name=?,email=?,phone=?,department=?,position=?,employment_type=?,salary_type=?,monthly_salary_sen=?,hourly_rate_sen=?,start_date=?,ic_number=?,epf_number=?,tax_number=?,bank_name=?,bank_account_number=?,updated_at=? WHERE id=? AND company_id=?").bind(...values,now,employeeId,user.companyId)
  : db.prepare("INSERT INTO employees (id,company_id,employee_code,full_name,email,phone,department,position,employment_type,salary_type,monthly_salary_sen,hourly_rate_sen,start_date,ic_number,epf_number,tax_number,bank_name,bank_account_number,status,statutory_profile,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active','my_under_60',?,?)").bind(employeeId,user.companyId,...values,now,now);
 const result = await db.batch([mutation,audit(db,user,employeeId,"employee.saved",now)]);
 if (!result[0].meta.changes) return {error:"Employee not found in your company."};
 return {ok:existingId ? "Employee profile updated." : "Employee added to the directory."};
}

export async function updateSelfProfile(db: D1Database, user: DemoUser, input: Input, now: string): Promise<ProfileSaveResult> {
 if (!user.employeeId) return {error:"Employee profile unavailable."};
 const parsed = parseProfile({email:input.email,phone:input.phone,bankAccountNumber:input.bankAccountNumber});
 if (!parsed.success) return {error:"Review the highlighted profile fields.",fieldErrors:{...parsed.fieldErrors}};
 const {email,phone,bankAccountNumber} = parsed.data;
 const result = await db.batch([
  db.prepare("UPDATE employees SET email=?,phone=?,bank_account_number=?,updated_at=? WHERE id=? AND company_id=?").bind(email,phone,bankAccountNumber || null,now,user.employeeId,user.companyId),
  audit(db,user,user.employeeId,"employee.self_update",now),
 ]);
 return result[0].meta.changes ? {ok:"Profile information updated successfully."} : {error:"Employee not found in your company."};
}
