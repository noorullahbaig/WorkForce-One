import {
	Form, Link, NavLink, useActionData, useLoaderData, useLocation, useNavigation,
} from "react-router";
import {
	Bell, Building2, CalendarDays, Check, ChevronRight, Clock3, Coffee, Download,
	FileText, Fingerprint, Home, Landmark, LayoutDashboard, LogOut, Menu, Play, Plus, QrCode,
	RotateCcw, Search, ShieldCheck, SlidersHorizontal, Square, Trash2, UserCheck,
	UserMinus, UserRound, Users, WalletCards, X,
} from "lucide-react";
import { useState } from "react";
import { calculateAttendance } from "../domain/attendance";
import { cloudflareContext } from "../context";
import { calculatePayroll, type PayrollBreakdown } from "../domain/payroll";
import { date, initials, money, time } from "../lib/format";
import { assertSameOrigin, requireUser, type DemoUser } from "../services/auth.server";
import { resetDemoData } from "../services/reset.server";
import type { Route } from "./+types/portal";

type Employee = { id:string; employeeCode:string; fullName:string; email:string; phone:string; department:string; position:string; employmentType:string; salaryType:"monthly"|"hourly"; monthlySalarySen:number|null; hourlyRateSen:number|null; startDate:string; status:string; icNumber:string|null; epfNumber:string|null; taxNumber:string|null; bankName:string|null; bankAccountNumber:string|null };
type Attendance = { id:string; employeeId:string; fullName:string; employeeCode:string; workDate:string; clockIn:string|null; clockOut:string|null; clockInMethod:string|null; clockOutMethod:string|null; workedMinutes:number|null; overtimeMinutes:number|null; status:string };
type Leave = { id:string; employeeId:string; fullName:string; leaveTypeId:string; typeName:string; paid:number; startDate:string; endDate:string; days:number; reason:string; status:string };
type Payroll = { id:string; period:string; periodStart:string; periodEnd:string; payDate:string; status:string; grossTotalSen:number; deductionTotalSen:number; netTotalSen:number; employerContributionTotalSen:number; finalisedAt:string|null; policyName:string };
type Payslip = { id:string; employeeId:string; fullName:string; period:string; payDate:string; grossPaySen:number; totalDeductionsSen:number; netPaySen:number; breakdownJson:string };
type Notification = { id:string; title:string; body:string; href:string|null; readAt:string|null; createdAt:string };
type Balance = { employeeId:string; leaveTypeId:string; name:string; paid:number; allocatedDays:number; usedDays:number };
type PayrollAdjustment = { id:string; payrollRunId:string; employeeId:string; fullName:string; type:"allowance"|"bonus"|"deduction"|"pcb"; description:string; amountSen:number; reason:string|null; createdAt:string };
type PolicyRecord = { id:string; name:string; effectiveFrom:string; verificationDate:string; normalDayMinutes:number; overtimeMultiplierBasisPoints:number; active:number };
type CompanyInfo = { id:string; name:string; registrationNumber:string; timezone:string };

export const meta = () => [{ title: "Workforce One · Merdeka Coffee" }];

async function all<T>(statement: D1PreparedStatement) { return (await statement.all<T>()).results; }

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.get(cloudflareContext).env;
	const admin = new URL(request.url).pathname.startsWith("/admin");
	const user = await requireUser(request, env, admin ? "admin" : "employee");
	const employeeScope = admin ? "" : " WHERE e.id = ?";
	const bind = <T extends D1PreparedStatement>(statement: T) => admin ? statement : statement.bind(user.employeeId);
	const [employees, attendance, leave, payrolls, payslips, notifications, balances, adjustments, policies, companyInfo] = await Promise.all([
		all<Employee>(bind(env.DB.prepare(`SELECT e.id, e.employee_code employeeCode, e.full_name fullName, e.email, e.phone, e.department, e.position, e.employment_type employmentType, e.salary_type salaryType, e.monthly_salary_sen monthlySalarySen, e.hourly_rate_sen hourlyRateSen, e.start_date startDate, e.status, e.ic_number icNumber, e.epf_number epfNumber, e.tax_number taxNumber, e.bank_name bankName, e.bank_account_number bankAccountNumber FROM employees e${employeeScope} ORDER BY e.full_name`))),
		all<Attendance>(bind(env.DB.prepare(`SELECT a.id, a.employee_id employeeId, e.full_name fullName, e.employee_code employeeCode, a.work_date workDate, a.clock_in clockIn, a.clock_out clockOut, a.clock_in_method clockInMethod, a.clock_out_method clockOutMethod, a.worked_minutes workedMinutes, a.overtime_minutes overtimeMinutes, a.status FROM attendance_records a JOIN employees e ON e.id=a.employee_id${employeeScope} ORDER BY a.work_date DESC, e.full_name`))),
		all<Leave>(bind(env.DB.prepare(`SELECT l.id, l.employee_id employeeId, e.full_name fullName, l.leave_type_id leaveTypeId, t.name typeName, t.paid, l.start_date startDate, l.end_date endDate, l.days, l.reason, l.status FROM leave_requests l JOIN employees e ON e.id=l.employee_id JOIN leave_types t ON t.id=l.leave_type_id${employeeScope} ORDER BY l.created_at DESC`))),
		all<Payroll>(env.DB.prepare(`SELECT r.id, r.period, r.period_start periodStart, r.period_end periodEnd, r.pay_date payDate, r.status, r.gross_total_sen grossTotalSen, r.deduction_total_sen deductionTotalSen, r.net_total_sen netTotalSen, r.employer_contribution_total_sen employerContributionTotalSen, r.finalised_at finalisedAt, p.name policyName FROM payroll_runs r JOIN payroll_policies p ON p.id=r.policy_id ORDER BY r.period DESC`)),
		all<Payslip>(bind(env.DB.prepare(`SELECT p.id, p.employee_id employeeId, e.full_name fullName, r.period, r.pay_date payDate, pr.gross_pay_sen grossPaySen, pr.total_deductions_sen totalDeductionsSen, pr.net_pay_sen netPaySen, pr.breakdown_json breakdownJson FROM payslips p JOIN employees e ON e.id=p.employee_id JOIN payroll_runs r ON r.id=p.payroll_run_id JOIN payroll_results pr ON pr.id=p.payroll_result_id${employeeScope} ORDER BY r.period DESC`))),
		all<Notification>(env.DB.prepare(`SELECT id,title,body,href,read_at readAt,created_at createdAt FROM notifications WHERE user_id=? ORDER BY created_at DESC`).bind(user.id)),
		all<Balance>(bind(env.DB.prepare(`SELECT b.employee_id employeeId,b.leave_type_id leaveTypeId,t.name,t.paid,b.allocated_days allocatedDays,b.used_days usedDays FROM leave_balances b JOIN leave_types t ON t.id=b.leave_type_id JOIN employees e ON e.id=b.employee_id${employeeScope} ORDER BY t.name`))),
		all<PayrollAdjustment>(bind(env.DB.prepare(`SELECT a.id, a.payroll_run_id payrollRunId, a.employee_id employeeId, e.full_name fullName, a.type, a.description, a.amount_sen amountSen, a.reason, a.created_at createdAt FROM payroll_adjustments a JOIN employees e ON e.id=a.employee_id${employeeScope} ORDER BY a.created_at DESC`))),
		all<PolicyRecord>(env.DB.prepare(`SELECT id, name, effective_from effectiveFrom, verification_date verificationDate, normal_day_minutes normalDayMinutes, overtime_multiplier_basis_points overtimeMultiplierBasisPoints, active FROM payroll_policies ORDER BY created_at DESC`)),
		env.DB.prepare("SELECT id, name, registration_number registrationNumber, timezone FROM companies WHERE id='company-merdeka'").first<CompanyInfo>(),
	]);
	return {
		user, admin, company: "Merdeka Coffee",
		companyInfo: companyInfo ?? { id: "company-merdeka", name: "Merdeka Coffee Sdn. Bhd.", registrationNumber: "202001028884", timezone: "Asia/Kuala_Lumpur" },
		employees, attendance, leave, payrolls, payslips, notifications, balances, adjustments, policies,
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	assertSameOrigin(request);
	const env = context.get(cloudflareContext).env;
	const adminPath = new URL(request.url).pathname.startsWith("/admin");
	const user = await requireUser(request, env, adminPath ? "admin" : "employee");
	const data = Object.fromEntries(await request.formData());
	const intent = String(data.intent ?? "");
	const now = new Date().toISOString();

	if (intent === "read-notification") {
		await env.DB.prepare("UPDATE notifications SET read_at=? WHERE id=? AND user_id=?").bind(now, data.id, user.id).run();
		return { ok: "Notification marked as read." };
	}
	if (intent === "apply-leave" && user.employeeId) {
		const start = String(data.startDate); const end = String(data.endDate);
		const days = Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
		if (!start || !end || days < 1 || !String(data.reason).trim()) return { error: "Choose valid dates and add a reason." };
		await env.DB.batch([
			env.DB.prepare("INSERT INTO leave_requests (id,employee_id,leave_type_id,start_date,end_date,days,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',?,?)").bind(crypto.randomUUID(),user.employeeId,data.leaveTypeId,start,end,days,String(data.reason),now,now),
			env.DB.prepare("INSERT INTO notifications (id,user_id,title,body,href,created_at) VALUES (?,'user-admin','Leave request needs review',?,'/admin/leave',?)").bind(crypto.randomUUID(),`${user.name} requested ${days} day${days === 1 ? "" : "s"} of leave.`,now),
		]);
		return { ok: "Leave request sent for approval." };
	}
	if (intent === "employee-clock" && user.employeeId) {
		const todayDate = "2026-08-26";
		const existing = await env.DB.prepare("SELECT id, clock_in clockIn, clock_out clockOut, status FROM attendance_records WHERE employee_id=? AND work_date=?").bind(user.employeeId, todayDate).first<{id:string;clockIn:string|null;clockOut:string|null;status:string}>();
		if (!existing || !existing.clockIn) {
			const recordId = existing?.id ?? crypto.randomUUID();
			if (existing) {
				await env.DB.prepare("UPDATE attendance_records SET clock_in=?, clock_in_method='qr', status='missing_clock_out', updated_at=? WHERE id=?").bind(now, now, recordId).run();
			} else {
				await env.DB.prepare("INSERT INTO attendance_records (id, employee_id, work_date, clock_in, clock_in_method, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'qr', 'missing_clock_out', ?, ?)").bind(recordId, user.employeeId, todayDate, now, now, now).run();
			}
			return { ok: `Clocked in successfully at ${time(now)}.` };
		}
		if (existing.clockIn && !existing.clockOut) {
			const res = calculateAttendance({ clockIn: existing.clockIn, clockOut: now, normalDayMinutes: 480 });
			await env.DB.prepare("UPDATE attendance_records SET clock_out=?, clock_out_method='qr', worked_minutes=?, overtime_minutes=?, status='present', updated_at=? WHERE id=?").bind(now, res.workedMinutes, res.overtimeMinutes, now, existing.id).run();
			return { ok: `Clocked out successfully · ${(res.workedMinutes! / 60).toFixed(1)} hours worked.` };
		}
		return { ok: "Shift for today is already completed." };
	}
	if (intent === "update-self-profile" && user.employeeId) {
		const phone = String(data.phone ?? "").trim();
		const email = String(data.email ?? "").trim();
		if (!phone || !email) return { error: "Please provide a valid phone number and email address." };
		await env.DB.batch([
			env.DB.prepare("UPDATE employees SET phone=?, email=?, updated_at=? WHERE id=?").bind(phone, email, now, user.employeeId),
			env.DB.prepare("UPDATE users SET email=?, updated_at=? WHERE id=?").bind(email, now, user.id),
			env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,'company-merdeka',?,'employee.self_update','employee',?,'{}',?)").bind(crypto.randomUUID(), user.id, user.employeeId, now),
		]);
		return { ok: "Contact information updated successfully." };
	}

	if (!adminPath) throw new Response("Forbidden", { status: 403 });

	if (intent === "review-leave") {
		const decision = data.decision === "approved" ? "approved" : "rejected";
		const record = await env.DB.prepare("SELECT employee_id employeeId,leave_type_id leaveTypeId,days,status FROM leave_requests WHERE id=?").bind(data.id).first<{employeeId:string;leaveTypeId:string;days:number;status:string}>();
		if (!record || record.status !== "pending") return { error: "This request has already been reviewed." };
		const statements = [
			env.DB.prepare("UPDATE leave_requests SET status=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=? AND status='pending'").bind(decision,user.id,now,now,data.id),
			env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,'company-merdeka',?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,`leave.${decision}`,'leave_request',data.id,JSON.stringify({days:record.days}),now),
		];
		if (decision === "approved") statements.push(env.DB.prepare("UPDATE leave_balances SET used_days=used_days+? WHERE employee_id=? AND leave_type_id=?").bind(record.days,record.employeeId,record.leaveTypeId));
		await env.DB.batch(statements);
		return { ok: `Leave request ${decision}.` };
	}
	if (intent === "simulate-attendance") {
		const employeeId = String(data.employeeId); const method = data.method === "fingerprint" ? "fingerprint" : "qr";
		const existing = await env.DB.prepare("SELECT id,work_date workDate,clock_in clockIn FROM attendance_records WHERE employee_id=? AND status='missing_clock_out' ORDER BY work_date ASC LIMIT 1").bind(employeeId).first<{id:string;workDate:string;clockIn:string|null}>();
		if (existing?.clockIn) {
			const clockOut = `${existing.workDate}T10:15:00.000Z`;
			const result = calculateAttendance({ clockIn: existing.clockIn, clockOut, normalDayMinutes: 480 });
			await env.DB.prepare("UPDATE attendance_records SET clock_out=?,clock_out_method=?,worked_minutes=?,overtime_minutes=?,status='present',updated_at=? WHERE id=?").bind(clockOut,method,result.workedMinutes,result.overtimeMinutes,now,existing.id).run();
			return { ok: `Clock-out captured · ${result.workedMinutes! / 60} hours worked.` };
		}
		await env.DB.prepare("INSERT INTO attendance_records (id,employee_id,work_date,clock_in,clock_in_method,status,created_at,updated_at) VALUES (?,?,'2026-08-26','2026-08-26T01:00:00.000Z',?,'missing_clock_out',?,?)").bind(crypto.randomUUID(),employeeId,method,now,now).run();
		return { ok: "Clock-in captured at 9:00 AM MYT." };
	}
	if (intent === "save-employee") {
		const required = ["fullName","email","phone","department","position","employeeCode","startDate"] as const;
		if (required.some((key)=>!String(data[key]??"").trim())) return { error: "Complete every required employee field." };
		const salaryType=data.salaryType==="hourly"?"hourly":"monthly"; const rateSen=Math.round(Number(data.rateRm)*100);
		if(!Number.isFinite(rateSen)||rateSen<=0)return {error:"Enter a valid pay rate."};
		const employeeId=String(data.employeeId||`custom-${crypto.randomUUID()}`);
		const icNumber = String(data.icNumber ?? "").trim() || null;
		const epfNumber = String(data.epfNumber ?? "").trim() || null;
		const taxNumber = String(data.taxNumber ?? "").trim() || null;
		const bankName = String(data.bankName ?? "").trim() || "Maybank";
		const bankAccountNumber = String(data.bankAccountNumber ?? "").trim() || null;

		if(data.employeeId){await env.DB.prepare("UPDATE employees SET employee_code=?,full_name=?,email=?,phone=?,department=?,position=?,employment_type=?,salary_type=?,monthly_salary_sen=?,hourly_rate_sen=?,start_date=?,ic_number=?,epf_number=?,tax_number=?,bank_name=?,bank_account_number=?,updated_at=? WHERE id=? AND company_id='company-merdeka'").bind(data.employeeCode,data.fullName,data.email,data.phone,data.department,data.position,data.employmentType,salaryType,salaryType==="monthly"?rateSen:null,salaryType==="hourly"?rateSen:null,data.startDate,icNumber,epfNumber,taxNumber,bankName,bankAccountNumber,now,employeeId).run()}
		else{await env.DB.prepare("INSERT INTO employees (id,company_id,employee_code,full_name,email,phone,department,position,employment_type,salary_type,monthly_salary_sen,hourly_rate_sen,start_date,status,statutory_profile,ic_number,epf_number,tax_number,bank_name,bank_account_number,created_at,updated_at) VALUES (?,'company-merdeka',?,?,?,?,?,?,?,?,?,?,?,'active','my_under_60',?,?,?,?,?,?,?)").bind(employeeId,data.employeeCode,data.fullName,data.email,data.phone,data.department,data.position,data.employmentType,salaryType,salaryType==="monthly"?rateSen:null,salaryType==="hourly"?rateSen:null,data.startDate,icNumber,epfNumber,taxNumber,bankName,bankAccountNumber,now,now).run()}
		await env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,'company-merdeka',?,'employee.saved','employee',?,'{}',?)").bind(crypto.randomUUID(),user.id,employeeId,now).run();
		return {ok:data.employeeId?"Employee profile updated.":"Employee added to the directory."};
	}
	if (intent === "toggle-employee-status") {
		const employeeId = String(data.employeeId);
		const targetStatus = data.status === "inactive" ? "inactive" : "active";
		await env.DB.batch([
			env.DB.prepare("UPDATE employees SET status=?, updated_at=? WHERE id=? AND company_id='company-merdeka'").bind(targetStatus, now, employeeId),
			env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,'company-merdeka',?,?,'employee',?,'{}',?)").bind(crypto.randomUUID(), user.id, `employee.${targetStatus}`, employeeId, now),
		]);
		return { ok: targetStatus === "inactive" ? "Employee marked as inactive." : "Employee reactivated." };
	}
	if (intent === "add-adjustment") {
		const payrollRunId = String(data.payrollRunId);
		const employeeId = String(data.employeeId);
		const type = String(data.type);
		const description = String(data.description ?? "").trim();
		const amountSen = Math.round(Number(data.amountRm) * 100);
		const reason = String(data.reason ?? "").trim();
		if (!employeeId || !description || !Number.isFinite(amountSen) || amountSen <= 0) return { error: "Please provide a valid amount and description." };
		await env.DB.prepare("INSERT INTO payroll_adjustments (id, payroll_run_id, employee_id, type, description, amount_sen, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), payrollRunId, employeeId, type, description, amountSen, reason || null, now).run();
		return { ok: "Payroll adjustment added." };
	}
	if (intent === "delete-adjustment") {
		await env.DB.prepare("DELETE FROM payroll_adjustments WHERE id=?").bind(data.id).run();
		return { ok: "Payroll adjustment removed." };
	}
	if (intent === "clone-policy") {
		const name = String(data.name ?? "").trim();
		const normalDayMinutes = Math.round(Number(data.workdayHours ?? 8) * 60);
		const overtimeMultiplierBasisPoints = Math.round(Number(data.overtimeMultiplier ?? 1.5) * 10000);
		if (!name || normalDayMinutes <= 0) return { error: "Enter a valid policy name and daily hours." };
		const policyId = `policy-${crypto.randomUUID().slice(0, 8)}`;
		await env.DB.prepare("INSERT INTO payroll_policies (id, company_id, name, effective_from, verification_date, source_urls_json, normal_day_minutes, overtime_multiplier_basis_points, locked, active, created_at, updated_at) VALUES (?, 'company-merdeka', ?, '2026-01-01', '2026-08-26', '[]', ?, ?, 0, 1, ?, ?)").bind(policyId, name, normalDayMinutes, overtimeMultiplierBasisPoints, now, now).run();
		return { ok: `Custom policy "${name}" created.` };
	}
	if (intent === "reset-demo") {
		await resetDemoData(env.DB);
		return { ok: "Data restored to initial baseline." };
	}
	if (intent === "finalise-payroll") return finalisePayroll(String(data.id), user, env);
	return { error: "That action is not available." };
}

async function finalisePayroll(id: string, user: DemoUser, env: Env) {
	const run = await env.DB.prepare("SELECT id,status,period FROM payroll_runs WHERE id=?").bind(id).first<{id:string;status:string;period:string}>();
	if (!run) return { error: "Payroll run not found." };
	if (run.status === "finalised") return { ok: "Payroll was already finalised safely." };
	const missing = await all<{fullName:string}>(env.DB.prepare("SELECT e.full_name fullName FROM attendance_records a JOIN employees e ON e.id=a.employee_id WHERE a.status='missing_clock_out'"));
	if (missing.length) return { error: `Resolve missing clock-outs before finalising: ${missing.map((row) => row.fullName).join(", ")}.` };
	const employees = await all<Employee>(env.DB.prepare("SELECT id,employee_code employeeCode,full_name fullName,email,phone,department,position,employment_type employmentType,salary_type salaryType,monthly_salary_sen monthlySalarySen,hourly_rate_sen hourlyRateSen,start_date startDate,status FROM employees WHERE status!='inactive'"));
	const adjustments = await all<{employeeId:string;type:string;amountSen:number}>(env.DB.prepare("SELECT employee_id employeeId,type,amount_sen amountSen FROM payroll_adjustments WHERE payroll_run_id=?").bind(id));
	const attendance = await all<{employeeId:string;regularMinutes:number;overtimeMinutes:number}>(env.DB.prepare("SELECT employee_id employeeId,COALESCE(SUM(MIN(worked_minutes,480)),0) regularMinutes,COALESCE(SUM(overtime_minutes),0) overtimeMinutes FROM attendance_records WHERE work_date LIKE '2026-08-%' GROUP BY employee_id"));
	const unpaid = await all<{employeeId:string;days:number}>(env.DB.prepare("SELECT l.employee_id employeeId,COALESCE(SUM(l.days),0) days FROM leave_requests l JOIN leave_types t ON t.id=l.leave_type_id WHERE l.status='approved' AND t.paid=0 AND l.start_date LIKE '2026-08-%' GROUP BY l.employee_id"));
	let gross=0,deductions=0,net=0,employer=0; const statements:D1PreparedStatement[]=[]; const timestamp=new Date().toISOString();
	for (const employee of employees) {
		const att=attendance.find((row)=>row.employeeId===employee.id); const adjs=adjustments.filter((row)=>row.employeeId===employee.id);
		const sum=(type:string)=>adjs.filter((row)=>row.type===type).reduce((total,row)=>total+row.amountSen,0);
		const input={salaryType:employee.salaryType,monthlySalarySen:employee.monthlySalarySen,hourlyRateSen:employee.hourlyRateSen,regularMinutes:att?.regularMinutes ?? (employee.salaryType==="monthly"?0:0),overtimeMinutes:att?.overtimeMinutes??0,unpaidLeaveDays:unpaid.find((row)=>row.employeeId===employee.id)?.days??0,wagePeriodDays:31,allowanceSen:sum("allowance"),bonusSen:sum("bonus"),otherDeductionSen:sum("deduction"),pcbSen:sum("pcb"),overtimeMultiplier:1.5,normalDayMinutes:480};
		let breakdown:PayrollBreakdown; try { breakdown=calculatePayroll(input); } catch { return { error:`${employee.fullName} has an incomplete pay profile.` }; }
		gross+=breakdown.grossPaySen;deductions+=breakdown.totalDeductionsSen;net+=breakdown.netPaySen;employer+=breakdown.totalEmployerContributionsSen;
		const resultId=`result-${run.period}-${employee.id}`; const payslipId=`payslip-${run.period}-${employee.id}`;
		statements.push(env.DB.prepare("INSERT INTO payroll_results (id,payroll_run_id,employee_id,input_snapshot_json,breakdown_json,gross_pay_sen,total_deductions_sen,net_pay_sen,employer_contributions_sen,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(resultId,id,employee.id,JSON.stringify({...input,policyId:"policy-my-2026"}),JSON.stringify(breakdown),breakdown.grossPaySen,breakdown.totalDeductionsSen,breakdown.netPaySen,breakdown.totalEmployerContributionsSen,timestamp));
		statements.push(env.DB.prepare("INSERT INTO payslips (id,payroll_result_id,payroll_run_id,employee_id,created_at) VALUES (?,?,?,?,?)").bind(payslipId,resultId,id,employee.id,timestamp));
		if(employee.id==="emp-001") statements.push(env.DB.prepare("INSERT INTO notifications (id,user_id,title,body,href,created_at) VALUES (?,'user-employee','August payslip is ready','Your August 2026 payslip is available.',?,?)").bind(crypto.randomUUID(),`/employee/payslips/${payslipId}`,timestamp));
	}
	const key=`finalise-${run.period}`;
	statements.push(env.DB.prepare("UPDATE payroll_runs SET status='finalised',gross_total_sen=?,deduction_total_sen=?,net_total_sen=?,employer_contribution_total_sen=?,idempotency_key=?,finalised_at=?,updated_at=? WHERE id=? AND status='draft'").bind(gross,deductions,net,employer,key,timestamp,timestamp,id));
	statements.push(env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,'company-merdeka',?,'payroll.finalised','payroll_run',?,?,?)").bind(crypto.randomUUID(),user.id,id,JSON.stringify({period:run.period,policyId:"policy-my-2026"}),timestamp));
	await env.DB.batch(statements);
	return { ok: "Payroll finalised. Snapshots and payslips are now immutable." };
}

export default function Portal() {
	const data=useLoaderData<typeof loader>(); const location=useLocation(); const actionData=useActionData<typeof action>(); const navigation=useNavigation();
	const path=location.pathname; const busy=navigation.state!=="idle";
	return <div className={data.admin?"app-shell admin-shell":"app-shell employee-shell"}>
		<AppNavigation admin={data.admin} user={data.user} unread={data.notifications.filter((item)=>!item.readAt).length}/>
		<main className="workspace">
			<header className="topbar">
				<div>
					<MobileMenu admin={data.admin}/>
					<CompanyDropdown companyInfo={data.companyInfo} employeeCount={data.employees.length}/>
				</div>
				<div className="top-actions">
					<Link to={data.admin?"/admin/notifications":"/employee/notifications"} aria-label="Notifications" className="icon-button"><Bell/>{data.notifications.some((item)=>!item.readAt)&&<i/>}</Link>
					<div className="avatar">{initials(data.user.name)}</div>
				</div>
			</header>
			{busy&&<div className="route-progress"/>}
			{actionData && ("ok" in actionData || "error" in actionData) && <div className={`toast ${"error" in actionData?"danger":"success"}`}>{"error" in actionData?actionData.error:actionData.ok}</div>}
			<div className="page-wrap">{data.admin?<AdminRouter path={path} data={data}/>:<EmployeeRouter path={path} data={data}/>}</div>
		</main>
	</div>;
}

function CompanyDropdown({companyInfo, employeeCount}:{companyInfo:CompanyInfo; employeeCount:number}) {
	return <details className="company-popover">
		<summary className="company-switch">
			<Coffee/> {companyInfo.name} <ChevronRight/>
		</summary>
		<div className="company-menu">
			<dl>
				<dt>Entity</dt>
				<dd>{companyInfo.name}</dd>
				<dt>Registration No</dt>
				<dd>{companyInfo.registrationNumber}</dd>
				<dt>Timezone</dt>
				<dd>{companyInfo.timezone} (UTC+8)</dd>
				<dt>Headcount</dt>
				<dd>{employeeCount} active records</dd>
			</dl>
		</div>
	</details>;
}

function MobileMenu({admin}:{admin:boolean}) { const links=admin?[["/admin","Home"],["/admin/employees","People"],["/admin/attendance","Attendance"],["/admin/leave","Leave"],["/admin/payroll","Payroll"],["/admin/payroll/policies","Policies"],["/admin/reports","Reports"],["/admin/notifications","Notifications"]]:[["/employee","Home"],["/employee/attendance","Attendance"],["/employee/leave","Leave"],["/employee/payslips","Payslips"],["/employee/notifications","Notifications"],["/employee/profile","Profile"]]; return <details className="mobile-menu"><summary aria-label="Open navigation"><Menu/></summary><div className="mobile-menu-sheet"><div><strong>Navigate</strong><span>Workforce One</span></div><nav>{links.map(([to,label])=><Link key={to} to={to}>{label}<ChevronRight/></Link>)}</nav><Form method="post" action="/logout"><button className="button secondary wide"><LogOut/>Sign out</button></Form></div></details> }

function AppNavigation({admin,user,unread}:{admin:boolean;user:DemoUser;unread:number}) {
	const adminItems=[["/admin",LayoutDashboard,"Home"],["/admin/employees",Users,"People"],["/admin/attendance",Clock3,"Time"],["/admin/payroll",WalletCards,"Payroll"],["/admin/reports",FileText,"Reports"]] as const;
	const employeeItems=[["/employee",Home,"Home"],["/employee/attendance",Clock3,"Attendance"],["/employee/leave",CalendarDays,"Leave"],["/employee/payslips",WalletCards,"Payslips"],["/employee/profile",UserRound,"Profile"]] as const;
	const items=admin?adminItems:employeeItems;
	return <><aside className="sidebar"><div className="wordmark inverse"><span>W1</span> Workforce One</div><p className="nav-label">Workspace</p><nav>{items.map(([to,Icon,label])=><NavLink end={to===(admin?"/admin":"/employee")} to={to} key={to}><Icon/><span>{label}</span>{label==="Home"&&unread>0?<b>{unread}</b>:null}</NavLink>)}</nav><div className="sidebar-foot"><Link to={admin?"/admin/notifications":"/employee/notifications"}><Bell/>Notifications{unread?<b>{unread}</b>:null}</Link><Form method="post" action="/logout"><button><LogOut/>Sign out</button></Form><div className="account"><div className="avatar">{initials(user.name)}</div><span><strong>{user.name}</strong><small>{admin?"People administrator":"Employee"}</small></span></div></div></aside>
	<nav className="bottom-nav">{items.slice(0,5).map(([to,Icon,label],index)=><NavLink end={to===(admin?"/admin":"/employee")} to={to} key={to}><Icon/><span>{admin&&index===4?"More":label}</span></NavLink>)}</nav></>;
}

function PageHeader({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:React.ReactNode}) { return <div className="page-header"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action&&<div className="page-actions">{action}</div>}</div>; }
function Status({value}:{value:string}) { return <span className={`status ${value.replaceAll("_","-")}`}><i/>{value.replaceAll("_"," ")}</span>; }
function Empty({title,body}:{title:string;body:string}) { return <div className="empty"><FileText/><h3>{title}</h3><p>{body}</p></div>; }

function AdminRouter({path,data}:{path:string;data:Awaited<ReturnType<typeof loader>>}) {
	if(path.includes("/employees/")) return <EmployeeInspector employee={data.employees.find((e)=>path.endsWith(e.id))}/>;
	if(path==="/admin/employees") return <People data={data}/>;
	if(path==="/admin/attendance/simulate") return <Simulator employees={data.employees}/>;
	if(path==="/admin/attendance") return <AttendancePage records={data.attendance}/>;
	if(path==="/admin/leave") return <LeaveAdmin records={data.leave}/>;
	if(path==="/admin/payroll/policies") return <Policy policies={data.policies}/>;
	if(path.includes("/admin/payroll/")) return <PayrollDetail run={data.payrolls.find((r)=>path.endsWith(r.id))} employees={data.employees} attendance={data.attendance} adjustments={data.adjustments}/>;
	if(path==="/admin/payroll") return <PayrollList runs={data.payrolls}/>;
	if(path==="/admin/reports") return <Reports runs={data.payrolls}/>;
	if(path==="/admin/notifications") return <Notifications items={data.notifications}/>;
	return <AdminHome data={data}/>;
}

function AdminHome({data}:{data:Awaited<ReturnType<typeof loader>>}) {
	const pending=data.leave.filter((r)=>r.status==="pending").length, missing=data.attendance.filter((r)=>r.status==="missing_clock_out").length, draft=data.payrolls.find((r)=>r.status==="draft");
	return <><PageHeader eyebrow="Wednesday · 26 August" title={`Good morning, ${data.user.name.split(" ")[0]}`} description="Here’s what needs attention across Merdeka Coffee." action={<Link className="button primary" to="/admin/attendance/simulate"><Fingerprint/>Attendance terminal</Link>}/>
		<section className="metric-strip"><article><span>Active people</span><strong>{data.employees.filter((e)=>e.status!=="inactive").length}</strong><small>Across {new Set(data.employees.map((e)=>e.department)).size} teams</small></article><article><span>Present today</span><strong>{data.attendance.filter((r)=>r.workDate==="2026-08-26"&&r.status!=="absent").length}<em> / {data.employees.length}</em></strong><small>{missing} missing clock-out{missing===1?"":"s"}</small></article><article><span>Leave requests</span><strong>{pending}</strong><small>Awaiting review</small></article><article><span>August payroll</span><strong>{draft?"Draft":"Finalised"}</strong><small>Pay day · 31 Aug</small></article></section>
		<div className="dashboard-grid"><section className="surface"><div className="section-head"><div><p className="eyebrow">Action queue</p><h2>Needs your attention</h2></div><span className="count">{pending+missing}</span></div>
			{missing>0&&<Link className="action-row" to="/admin/attendance"><span className="action-icon warning"><Clock3/></span><span><strong>Complete missing clock-outs</strong><small>{missing} records can block payroll finalisation</small></span><ChevronRight/></Link>}
			{pending>0&&<Link className="action-row" to="/admin/leave"><span className="action-icon emerald"><CalendarDays/></span><span><strong>Review leave requests</strong><small>{pending} request waiting for a decision</small></span><ChevronRight/></Link>}
			<Link className="action-row" to="/admin/payroll/payroll-2026-08"><span className="action-icon ink"><WalletCards/></span><span><strong>Review August payroll</strong><small>Inputs are ready for validation</small></span><ChevronRight/></Link>
		</section><section className="surface"><div className="section-head"><div><p className="eyebrow">Payroll pulse</p><h2>Latest finalised run</h2></div><Link to="/admin/payroll">View all</Link></div><div className="payroll-pulse"><span>July 2026</span><strong>{money(data.payrolls.find((r)=>r.status==="finalised")?.netTotalSen)}</strong><small>Net pay distributed</small><div><span>Gross <b>{money(data.payrolls.find((r)=>r.status==="finalised")?.grossTotalSen)}</b></span><span>Deductions <b>{money(data.payrolls.find((r)=>r.status==="finalised")?.deductionTotalSen)}</b></span></div></div></section></div>
	</>;
}

function People({data}:{data:Awaited<ReturnType<typeof loader>>}) {
	const [query,setQuery]=useState("");
	const [showFilters, setShowFilters]=useState(false);
	const [dept, setDept]=useState("all");
	const [type, setType]=useState("all");
	const [status, setStatus]=useState("all");

	const departments = Array.from(new Set(data.employees.map((e)=>e.department))).sort();
	const hasActiveFilters = dept !== "all" || type !== "all" || status !== "all";

	const filtered = data.employees.filter((e) => {
		const matchesQuery = `${e.fullName} ${e.position} ${e.department} ${e.employeeCode}`.toLowerCase().includes(query.toLowerCase());
		const matchesDept = dept === "all" || e.department === dept;
		const matchesType = type === "all" || e.employmentType === type;
		const matchesStatus = status === "all" || e.status === status;
		return matchesQuery && matchesDept && matchesType && matchesStatus;
	});

	return <>
		<PageHeader eyebrow="People" title="Employee directory" description={`${data.employees.length} people · employment, pay and statutory profiles`} action={<a className="button primary" href="#add-employee"><Plus/>Add employee</a>}/>
		<div className="toolbar">
			<div className="search">
				<Search/>
				<input aria-label="Search employees" placeholder="Search name, role or employee ID" value={query} onChange={(event)=>setQuery(event.target.value)}/>
			</div>
			<button className={`button ${showFilters || hasActiveFilters ? "primary" : "secondary"}`} onClick={()=>setShowFilters(!showFilters)}>
				<SlidersHorizontal/>Filters {hasActiveFilters ? "(Active)" : ""}
			</button>
		</div>

		{showFilters && (
			<div className="filter-panel">
				<div className="filter-grid">
					<label>
						Department
						<select value={dept} onChange={(e)=>setDept(e.target.value)}>
							<option value="all">All departments</option>
							{departments.map((d)=><option key={d} value={d}>{d}</option>)}
						</select>
					</label>
					<label>
						Employment type
						<select value={type} onChange={(e)=>setType(e.target.value)}>
							<option value="all">All types</option>
							<option value="full_time">Full time</option>
							<option value="part_time">Part time</option>
							<option value="contract">Contract</option>
						</select>
					</label>
					<label>
						Status
						<select value={status} onChange={(e)=>setStatus(e.target.value)}>
							<option value="all">All statuses</option>
							<option value="active">Active</option>
							<option value="on_leave">On leave</option>
							<option value="inactive">Inactive</option>
						</select>
					</label>
				</div>
				{hasActiveFilters && (
					<div className="filter-actions">
						<button className="text-button" onClick={()=>{setDept("all"); setType("all"); setStatus("all");}}>
							<RotateCcw size={14}/> Reset filters
						</button>
					</div>
				)}
			</div>
		)}

		<section className="table surface">
			<div className="table-head"><span>Employee</span><span>Team & role</span><span>Pay profile</span><span>Status</span><span/></div>
			{filtered.length ? filtered.map((e)=><Link className="table-row" to={`/admin/employees/${e.id}`} key={e.id}><span className="person"><i>{initials(e.fullName)}</i><span><strong>{e.fullName}</strong><small>{e.employeeCode} · {e.email}</small></span></span><span><strong>{e.department}</strong><small>{e.position}</small></span><span><strong>{e.salaryType==="monthly"?money(e.monthlySalarySen):`${money(e.hourlyRateSen)}/hr`}</strong><small>{e.employmentType.replace("_"," ")}</small></span><Status value={e.status}/><ChevronRight/></Link>) : <Empty title="No matching employees" body="Try adjusting your search or filters."/>}
		</section>
		<EmployeeForm/>
	</>;
}

function EmployeeForm({employee}:{employee?:Employee}) { return <details id="add-employee" className="surface employee-form"><summary>{employee?"Edit employee profile":"Add an employee"}<ChevronRight/></summary><Form method="post" className="form-stack"><input type="hidden" name="intent" value="save-employee"/>{employee&&<input type="hidden" name="employeeId" value={employee.id}/>}<div className="form-pair"><label>Full name<input name="fullName" defaultValue={employee?.fullName} required/></label><label>Employee ID<input name="employeeCode" defaultValue={employee?.employeeCode??`MC-${1011}`} required/></label></div><div className="form-pair"><label>Email<input name="email" type="email" defaultValue={employee?.email} required/></label><label>Phone<input name="phone" defaultValue={employee?.phone??"+60 "} required/></label></div><div className="form-pair"><label>Department<input name="department" defaultValue={employee?.department} required/></label><label>Position<input name="position" defaultValue={employee?.position} required/></label></div><div className="form-pair"><label>Employment<select name="employmentType" defaultValue={employee?.employmentType??"full_time"}><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option></select></label><label>Pay basis<select name="salaryType" defaultValue={employee?.salaryType??"monthly"}><option value="monthly">Monthly</option><option value="hourly">Hourly</option></select></label></div><div className="form-pair"><label>Rate (RM)<input name="rateRm" type="number" min="1" step="0.01" defaultValue={((employee?.monthlySalarySen??employee?.hourlyRateSen??450000)/100).toFixed(2)} required/></label><label>Start date<input name="startDate" type="date" defaultValue={employee?.startDate??"2026-08-26"} required/></label></div><div className="form-pair"><label>MyKad / IC No.<input name="icNumber" defaultValue={employee?.icNumber??""} placeholder="920315-10-5542"/></label><label>KWSP / EPF Member No.<input name="epfNumber" defaultValue={employee?.epfNumber??""} placeholder="21498102"/></label></div><div className="form-pair"><label>LHDN Tax No.<input name="taxNumber" defaultValue={employee?.taxNumber??""} placeholder="SG 291048201"/></label><label>Bank Name<input name="bankName" defaultValue={employee?.bankName??"Maybank"} placeholder="Maybank / CIMB / Public Bank"/></label></div><div className="form-pair"><label>Bank Account Number<input name="bankAccountNumber" defaultValue={employee?.bankAccountNumber??""} placeholder="514012384910"/></label><div/></div><button className="button primary">{employee?"Save changes":"Add employee"}</button></Form></details> }

function EmployeeInspector({employee}:{employee?:Employee}) {
	if(!employee) return <Empty title="Employee not found" body="This profile is not available."/>;
	return <>
		<PageHeader eyebrow="People / Employee" title={employee.fullName} description={`${employee.employeeCode} · ${employee.position}`} action={
			<>
				<Link className="button secondary" to="/admin/employees">Back</Link>
				<Form method="post" style={{margin:0}}>
					<input type="hidden" name="intent" value="toggle-employee-status"/>
					<input type="hidden" name="employeeId" value={employee.id}/>
					<input type="hidden" name="status" value={employee.status === "inactive" ? "active" : "inactive"}/>
					<button className={`button ${employee.status === "inactive" ? "primary" : "ghost"}`}>
						{employee.status === "inactive" ? <><UserCheck size={16}/> Activate</> : <><UserMinus size={16}/> Deactivate</>}
					</button>
				</Form>
				<a className="button primary" href="#add-employee">Edit profile</a>
			</>
		}/>
		<div className="profile-grid">
			<section className="surface profile-card">
				<div className="profile-hero">
					<i>{initials(employee.fullName)}</i>
					<div>
						<h2>{employee.fullName}</h2>
						<p>{employee.position} · {employee.department}</p>
						<Status value={employee.status}/>
					</div>
				</div>
				<dl>
					<div><dt>Email</dt><dd>{employee.email}</dd></div>
					<div><dt>Phone</dt><dd>{employee.phone}</dd></div>
					<div><dt>Joined</dt><dd>{date(employee.startDate)}</dd></div>
					<div><dt>MyKad / IC</dt><dd>{employee.icNumber || "—"}</dd></div>
					<div><dt>EPF Member No</dt><dd>{employee.epfNumber || "—"}</dd></div>
				</dl>
			</section>
			<section className="surface detail-list">
				<div className="section-head"><h2>Employment & banking</h2></div>
				<dl>
					<div><dt>Employment</dt><dd>{employee.employmentType.replace("_"," ")}</dd></div>
					<div><dt>Pay basis</dt><dd>{employee.salaryType}</dd></div>
					<div><dt>Current rate</dt><dd>{employee.salaryType==="monthly"?money(employee.monthlySalarySen):`${money(employee.hourlyRateSen)} / hour`}</dd></div>
					<div><dt>LHDN Tax No</dt><dd>{employee.taxNumber || "—"}</dd></div>
					<div><dt>Disbursement Bank</dt><dd>{employee.bankName || "Maybank"} · {employee.bankAccountNumber || "—"}</dd></div>
					<div><dt>Statutory policy</dt><dd>Malaysia Standard — 2026 (Under 60)</dd></div>
				</dl>
			</section>
		</div>
		<EmployeeForm employee={employee}/>
	</>;
}

function AttendancePage({records}:{records:Attendance[]}) {
	const [tab, setTab] = useState<"all" | "exceptions">("all");
	const exceptions = records.filter((r) => r.status === "missing_clock_out" || r.status === "late");
	const displayRecords = tab === "exceptions" ? exceptions : records;

	return <>
		<PageHeader eyebrow="Time" title="Attendance" description="Live records from fingerprint, QR and manual corrections." action={<Link className="button primary" to="/admin/attendance/simulate"><Fingerprint/>Open terminal</Link>}/>
		<div className="tabs">
			<button className={tab === "all" ? "active" : ""} onClick={()=>setTab("all")}>Daily records</button>
			<button className={tab === "exceptions" ? "active" : ""} onClick={()=>setTab("exceptions")}>Exceptions <b>{exceptions.length}</b></button>
		</div>
		<section className="table surface attendance-table">
			<div className="table-head"><span>Employee</span><span>Date</span><span>Clock in</span><span>Clock out</span><span>Worked</span><span>Status</span></div>
			{displayRecords.length ? displayRecords.map((r)=><div className="table-row" key={r.id}><span className="person"><i>{initials(r.fullName)}</i><span><strong>{r.fullName}</strong><small>{r.employeeCode}</small></span></span><span>{date(r.workDate,{weekday:"short",day:"numeric",month:"short"})}</span><span><strong>{time(r.clockIn)}</strong><small>{r.clockInMethod??"—"}</small></span><span><strong>{time(r.clockOut)}</strong><small>{r.clockOutMethod??"Needs correction"}</small></span><span>{r.workedMinutes?`${Math.floor(r.workedMinutes/60)}h ${r.workedMinutes%60}m`:"—"}</span><Status value={r.status}/></div>) : <Empty title="No exceptions" body="All shifts are complete and reconciled."/>}
		</section>
	</>;
}

function Simulator({employees}:{employees:Employee[]}) { return <><PageHeader eyebrow="Time / Terminal" title="Attendance terminal" description="Simulate clock-in/out terminal events and verify time calculations." action={<Link className="button secondary" to="/admin/attendance">View records</Link>}/><div className="simulator-grid"><section className="surface simulator"><div className="sim-display"><span className="live-dot">Terminal active</span><div className="scan-ring"><Fingerprint/></div><h2>Ready to capture</h2><p>Select an employee and device method. Existing open shifts will be clocked out at 6:15 PM MYT.</p></div><Form method="post" className="form-stack"><input type="hidden" name="intent" value="simulate-attendance"/><label>Employee<select name="employeeId" defaultValue="emp-001">{employees.map((e)=><option value={e.id} key={e.id}>{e.fullName} · {e.employeeCode}</option>)}</select></label><div className="method-choice"><label><input type="radio" name="method" value="fingerprint" defaultChecked/><span><Fingerprint/><strong>Fingerprint</strong><small>Front counter device</small></span></label><label><input type="radio" name="method" value="qr"/><span><QrCode/><strong>QR code</strong><small>Employee mobile scan</small></span></label></div><button className="button primary wide">Capture attendance</button></Form></section><aside className="surface sim-aside"><p className="eyebrow">Terminal operation</p><h3>Device event processing</h3><ul><li><Check/>Creates or completes an attendance record</li><li><Check/>Stores the chosen device method</li><li><Check/>Calculates worked time and overtime</li><li><Check/>Updates payroll inputs instantly</li></ul></aside></div></> }

function LeaveAdmin({records}:{records:Leave[]}) { return <><PageHeader eyebrow="People / Leave" title="Leave management" description="Review requests and maintain auditable balances."/><div className="metric-strip compact"><article><span>Pending</span><strong>{records.filter((r)=>r.status==="pending").length}</strong></article><article><span>Approved this month</span><strong>{records.filter((r)=>r.status==="approved").length}</strong></article><article><span>Unpaid leave inputs</span><strong>{records.filter((r)=>r.status==="approved"&&!r.paid).reduce((t,r)=>t+r.days,0)} days</strong></article></div><section className="request-list">{records.map((r)=><article className="surface request" key={r.id}><div className="person"><i>{initials(r.fullName)}</i><span><strong>{r.fullName}</strong><small>{r.typeName} · {r.days} day{r.days===1?"":"s"}</small></span></div><div><span>{date(r.startDate)}{r.startDate!==r.endDate?` – ${date(r.endDate)}`:""}</span><small>“{r.reason}”</small></div><Status value={r.status}/>{r.status==="pending"?<Form method="post" className="request-actions"><input type="hidden" name="intent" value="review-leave"/><input type="hidden" name="id" value={r.id}/><button className="button ghost" name="decision" value="rejected"><X/>Decline</button><button className="button primary" name="decision" value="approved"><Check/>Approve</button></Form>:<span/>}</article>)}</section></> }

function PayrollList({runs}:{runs:Payroll[]}) { return <><PageHeader eyebrow="Payroll" title="Payroll runs" description="A traceable path from source inputs to immutable payslips." action={<Link className="button secondary" to="/admin/payroll/policies"><ShieldCheck/>Statutory policy</Link>}/><section className="surface table payroll-table"><div className="table-head"><span>Pay period</span><span>Policy</span><span>Gross</span><span>Net pay</span><span>Status</span><span/></div>{runs.map((r)=><Link className="table-row" key={r.id} to={`/admin/payroll/${r.id}`}><span><strong>{date(r.periodStart,{month:"long",year:"numeric"})}</strong><small>Pay date · {date(r.payDate)}</small></span><span><strong>{r.policyName}</strong><small>Verified 26 Aug 2026</small></span><span>{r.status==="finalised"?money(r.grossTotalSen):"Calculated on review"}</span><span><strong>{r.status==="finalised"?money(r.netTotalSen):"—"}</strong></span><Status value={r.status}/><ChevronRight/></Link>)}</section></> }

function PayrollDetail({run,employees,attendance,adjustments}:{run?:Payroll;employees:Employee[];attendance:Attendance[];adjustments:PayrollAdjustment[]}) {
	if(!run) return <Empty title="Payroll not found" body="This run is not available."/>;
	const missing = attendance.filter((r)=>r.status==="missing_clock_out");
	const runAdjustments = adjustments.filter((a)=>a.payrollRunId === run.id);

	return <>
		<PageHeader eyebrow="Payroll / Run" title={`${date(run.periodStart,{month:"long",year:"numeric"})} payroll`} description={`Pay date ${date(run.payDate)} · ${run.policyName}`} action={run.status==="finalised"?<><a className="button secondary" href={`/resources/payroll/${run.id}.csv`}><Download/>CSV</a><a className="button secondary" href={`/resources/payroll/${run.id}.bank.csv`}><Landmark size={16}/>Bank CSV</a><a className="button primary" href={`/resources/payroll/${run.id}.pdf`}><FileText/>PDF report</a></>:undefined}/>
		<div className="payroll-steps"><span className="done"><i>1</i>Period</span><span className="done"><i>2</i>Inputs</span><span className={run.status==="finalised"?"done":"active"}><i>3</i>Review</span><span className={run.status==="finalised"?"done":""}><i>4</i>Finalise</span></div>
		{run.status==="draft"&&missing.length>0&&<div className="alert warning"><Clock3/><div><strong>{missing.length} attendance exception{missing.length===1?"":"s"} block finalisation</strong><p>{missing.map((r)=>r.fullName).join(", ")} need a clock-out.</p></div><Link className="button secondary" to="/admin/attendance/simulate">Resolve now</Link></div>}

		<section className="surface payroll-review">
			<div className="section-head"><div><p className="eyebrow">Calculation review</p><h2>{employees.length} employee snapshots</h2></div><span className="simulation-tag">Audit ready</span></div>
			<div className="review-head"><span>Employee</span><span>Pay basis</span><span>Attendance input</span><span>Policy</span></div>
			{employees.map((e)=>{
				const att=attendance.find((r)=>r.employeeId===e.id);
				return <div className="review-row" key={e.id}>
					<span className="person"><i>{initials(e.fullName)}</i><span><strong>{e.fullName}</strong><small>{e.employeeCode}</small></span></span>
					<span><strong>{e.salaryType==="monthly"?money(e.monthlySalarySen):`${money(e.hourlyRateSen)}/hr`}</strong><small>{e.salaryType}</small></span>
					<span><strong>{att?.workedMinutes?`${att.workedMinutes} min`:(e.salaryType==="monthly"?"Monthly base":"No hours")}</strong><small>{att?.overtimeMinutes??0} OT min</small></span>
					<span><strong>MY Standard 2026</strong><small>EPF · SOCSO · EIS</small></span>
				</div>;
			})}
		</section>

		{run.status === "draft" && (
			<section className="surface adjustment-panel">
				<div className="section-head">
					<div>
						<p className="eyebrow">Adjustments</p>
						<h2>Ad-hoc allowances & deductions</h2>
					</div>
				</div>
				{runAdjustments.length > 0 ? (
					<div className="adjustment-list">
						{runAdjustments.map((a)=>(
							<div className="adjustment-row" key={a.id}>
								<span><strong>{a.fullName}</strong><small>{a.description}</small></span>
								<span style={{textTransform:"capitalize"}}><b>{a.type}</b></span>
								<span>{money(a.amountSen)}</span>
								<Form method="post" style={{margin:0}}>
									<input type="hidden" name="intent" value="delete-adjustment"/>
									<input type="hidden" name="id" value={a.id}/>
									<button className="icon-button" style={{color:"var(--danger)"}} aria-label="Delete adjustment"><Trash2 size={16}/></button>
								</Form>
							</div>
						))}
					</div>
				) : (
					<p className="muted" style={{fontSize:".8rem",margin:"8px 0 16px"}}>No ad-hoc adjustments added to this run yet.</p>
				)}

				<details style={{marginTop:"16px"}} className="employee-form">
					<summary>Add an adjustment to this run <ChevronRight/></summary>
					<Form method="post" className="form-stack" style={{marginTop:"12px"}}>
						<input type="hidden" name="intent" value="add-adjustment"/>
						<input type="hidden" name="payrollRunId" value={run.id}/>
						<div className="form-pair">
							<label>Employee
								<select name="employeeId" required>
									{employees.map((e)=><option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>)}
								</select>
							</label>
							<label>Type
								<select name="type" required>
									<option value="allowance">Allowance (Transport / Meal)</option>
									<option value="bonus">Bonus / Incentive</option>
									<option value="deduction">Deduction (Advance / Unpaid)</option>
									<option value="pcb">PCB Tax adjustment</option>
								</select>
							</label>
						</div>
						<div className="form-pair">
							<label>Description
								<input name="description" placeholder="e.g. Performance bonus Q3" required/>
							</label>
							<label>Amount (RM)
								<input name="amountRm" type="number" step="0.01" min="1" placeholder="250.00" required/>
							</label>
						</div>
						<label>Reason / Notes
							<input name="reason" placeholder="Optional audit memo"/>
						</label>
						<button className="button primary">Add to draft run</button>
					</Form>
				</details>
			</section>
		)}

		{run.status==="draft"?<div className="finalise-bar"><div><ShieldCheck/><span><strong>Ready for an immutable snapshot</strong><small>Finalising generates protected payslips and cannot be undone.</small></span></div><Form method="post"><input type="hidden" name="intent" value="finalise-payroll"/><input type="hidden" name="id" value={run.id}/><button className="button primary">Finalise payroll</button></Form></div>:<div className="finalised-banner"><Check/><div><strong>Finalised {date(run.finalisedAt)}</strong><span>Net pay {money(run.netTotalSen)} · source and policy snapshots preserved</span></div></div>}
	</>;
}

function Policy({policies}:{policies:PolicyRecord[]}){
	return <>
		<PageHeader eyebrow="Payroll / Policies" title="Statutory Policies" description="Statutory contribution schedules for Malaysian employees under 60." action={<a className="button primary" href="#create-policy"><Plus/>Clone custom policy</a>}/>
		<details id="create-policy" className="surface employee-form" style={{marginBottom:"20px"}}>
			<summary>Create or clone statutory policy <ChevronRight/></summary>
			<Form method="post" className="form-stack" style={{marginTop:"14px"}}>
				<input type="hidden" name="intent" value="clone-policy"/>
				<div className="form-pair">
					<label>Policy name
						<input name="name" defaultValue="Custom Policy — 2026" required/>
					</label>
					<label>Standard workday (Hours)
						<input name="workdayHours" type="number" step="0.5" defaultValue="8" required/>
					</label>
				</div>
				<div className="form-pair">
					<label>Overtime rate multiplier
						<input name="overtimeMultiplier" type="number" step="0.1" defaultValue="1.5" required/>
					</label>
					<label>Effective date
						<input name="effectiveFrom" type="date" defaultValue="2026-09-01" required/>
					</label>
				</div>
				<button className="button primary">Save custom policy</button>
			</Form>
		</details>

		<div className="policy-grid">
			<section className="surface">
				<div className="policy-title"><ShieldCheck/><div><h2>{policies[0]?.name ?? "Malaysia Standard — 2026"}</h2><p>Effective 1 January 2026 · reviewed 26 August 2026</p></div><Status value="active"/></div>
				<dl className="policy-details">
					<div><dt>Normal workday</dt><dd>{(policies[0]?.normalDayMinutes ?? 480) / 60} hours / {policies[0]?.normalDayMinutes ?? 480} minutes</dd></div>
					<div><dt>Overtime multiplier</dt><dd>{((policies[0]?.overtimeMultiplierBasisPoints ?? 15000) / 10000).toFixed(1)}× ordinary hourly rate</dd></div>
					<div><dt>EPF</dt><dd>October 2025 wage-band schedule</dd></div>
					<div><dt>SOCSO & EIS</dt><dd>Contribution schedule · RM6,000 ceiling</dd></div>
					<div><dt>PCB</dt><dd>Verified external e-PCB amount only</dd></div>
				</dl>
			</section>
			<aside className="surface scope-note">
				<p className="eyebrow">Supported scope</p>
				<h3>Statutory policy guidelines</h3>
				<p>This policy models Malaysian standard statutory schedules (KWSP, PERKESO, EIS) for employees under 60. PCB reflects verified tax inputs.</p>
				<a href="https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution" target="_blank" rel="noreferrer">KWSP source <ChevronRight/></a>
				<a href="https://perkeso.gov.my/en/our-services/employer-employee/contributions" target="_blank" rel="noreferrer">PERKESO source <ChevronRight/></a>
			</aside>
		</div>
	</>;
}

function Reports({runs}:{runs:Payroll[]}){
	const final=runs.find((r)=>r.status==="finalised");
	return <>
		<PageHeader eyebrow="Reports" title="Payroll exports" description="Protected files generated directly from finalised snapshots."/>
		<div className="report-grid">
			<article className="surface report-card">
				<FileText/>
				<div>
					<h2>Payroll summary</h2>
					<p>Employee totals, deductions and employer contributions for accounting review.</p>
				</div>
				{final?<a className="button primary" href={`/resources/payroll/${final.id}.pdf`}><Download/>Download PDF</a>:<button disabled>No final run</button>}
			</article>
			<article className="surface report-card">
				<Landmark/>
				<div>
					<h2>Bank salary payout CSV</h2>
					<p>Universal corporate bank batch file (Name, MyKad IC, Bank, Account No, Net Pay RM).</p>
				</div>
				{final?<a className="button secondary" href={`/resources/payroll/${final.id}.bank.csv`}><Download/>Download Bank CSV</a>:<button disabled>No final run</button>}
			</article>
			<article className="surface report-card">
				<WalletCards/>
				<div>
					<h2>Detailed payroll CSV</h2>
					<p>Structured payroll result rows for reconciliation and external accounting systems.</p>
				</div>
				{final?<a className="button secondary" href={`/resources/payroll/${final.id}.csv`}><Download/>Download CSV</a>:<button disabled>No final run</button>}
			</article>
		</div>
	</>;
}

function Notifications({items}:{items:Notification[]}){return <><PageHeader eyebrow="Inbox" title="Notifications" description="Every alert links back to the work that created it."/><section className="surface notification-list">{items.length?items.map((item)=><article key={item.id} className={item.readAt?"":"unread"}><span className="notification-dot"/><div><strong>{item.title}</strong><p>{item.body}</p><small>{date(item.createdAt,{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</small></div><div>{item.href&&<Link className="text-button" to={item.href}>Open <ChevronRight/></Link>}{!item.readAt&&<Form method="post"><input type="hidden" name="intent" value="read-notification"/><input type="hidden" name="id" value={item.id}/><button className="text-button">Mark read</button></Form>}</div></article>):<Empty title="All caught up" body="New payroll, leave and attendance updates will appear here."/>}</section></>}

function EmployeeRouter({path,data}:{path:string;data:Awaited<ReturnType<typeof loader>>}){const employee=data.employees[0];if(path==="/employee/attendance")return <EmployeeAttendance records={data.attendance} employee={employee}/>;if(path==="/employee/leave")return <EmployeeLeave records={data.leave} balances={data.balances}/>;if(path.includes("/employee/payslips/"))return <PayslipDetail slip={data.payslips.find((p)=>path.endsWith(p.id))}/>;if(path==="/employee/payslips")return <Payslips slips={data.payslips}/>;if(path==="/employee/notifications")return <Notifications items={data.notifications}/>;if(path==="/employee/profile")return <EmployeeProfile employee={employee}/>;return <EmployeeHome data={data} employee={employee}/>}

function EmployeeHome({data,employee}:{data:Awaited<ReturnType<typeof loader>>;employee:Employee}){const today=data.attendance.find((r)=>r.workDate==="2026-08-26");const annual=data.balances.find((b)=>b.leaveTypeId==="leave-annual");return <><div className="employee-hello"><div><p>Wednesday, 26 August</p><h1>Good morning, {employee.fullName.split(" ")[0]}</h1></div><div className="avatar large">{initials(employee.fullName)}</div></div><section className="employee-hero"><div><p className="eyebrow light">Today’s attendance</p><h2>{today?.clockIn?"You’re clocked in":"Ready when you are"}</h2><p>{today?.clockIn?`Since ${time(today.clockIn)} · ${today.clockInMethod} scan`:"Start your workday with a secure scan."}</p></div><Link className="button paper" to="/employee/attendance">View activity <ChevronRight/></Link><span className="hero-orbit"><Clock3/></span></section><div className="employee-stats"><Link to="/employee/leave"><span><CalendarDays/></span><div><small>Annual leave</small><strong>{(annual?.allocatedDays??0)-(annual?.usedDays??0)} days</strong></div><ChevronRight/></Link><Link to="/employee/payslips"><span><WalletCards/></span><div><small>Latest net pay</small><strong>{money(data.payslips[0]?.netPaySen)}</strong></div><ChevronRight/></Link></div><section className="employee-section"><div className="section-head"><div><p className="eyebrow">For you</p><h2>Recent updates</h2></div><Link to="/employee/notifications">View all</Link></div>{data.notifications.slice(0,3).map((n)=><Link className="update-row" to={n.href??"/employee/notifications"} key={n.id}><span className="action-icon emerald"><Bell/></span><span><strong>{n.title}</strong><small>{n.body}</small></span><ChevronRight/></Link>)}</section></>}

function EmployeeAttendance({records,employee}:{records:Attendance[];employee:Employee}){
	const today=records.find((r)=>r.workDate==="2026-08-26");
	return <>
		<PageHeader eyebrow="Self-service" title="Attendance" description="Your workday history in Malaysia time."/>
		
		<section className="employee-clock-card">
			<div>
				<p className="eyebrow light">Shift Terminal</p>
				<h2>{today?.clockOut ? "Shift completed for today" : today?.clockIn ? "Currently on shift" : "Ready to start shift"}</h2>
				<p>{today?.clockIn ? `Started at ${time(today.clockIn)}` : "Record your attendance with one click."}</p>
			</div>
			<div className="employee-clock-actions">
				{!today?.clockIn && (
					<Form method="post" style={{margin:0}}>
						<input type="hidden" name="intent" value="employee-clock"/>
						<button className="button paper"><Play size={16}/> Clock In</button>
					</Form>
				)}
				{today?.clockIn && !today?.clockOut && (
					<Form method="post" style={{margin:0}}>
						<input type="hidden" name="intent" value="employee-clock"/>
						<button className="button paper"><Square size={16}/> Clock Out</button>
					</Form>
				)}
			</div>
		</section>

		<section className="attendance-today">
			<div>
				<p className="eyebrow light">Today · 26 Aug</p>
				<h2>{today?.clockOut?"Shift complete":today?.clockIn?"In progress":"Not clocked in"}</h2>
				<p>{today?.clockIn?`${time(today.clockIn)} clock-in · ${today.clockInMethod}`:"No event recorded"}</p>
			</div>
			<div className="timeline">
				<span className="active"><i/><small>Clock in</small><strong>{time(today?.clockIn)}</strong></span>
				<b/>
				<span className={today?.clockOut?"active":""}><i/><small>Clock out</small><strong>{time(today?.clockOut)}</strong></span>
			</div>
		</section>

		<section className="surface history">
			<div className="section-head"><h2>Activity history</h2><span>{employee.employeeCode}</span></div>
			{records.map((r)=><div className="history-row" key={r.id}><div className="date-tile"><b>{new Date(`${r.workDate}T00:00:00`).getDate()}</b><small>Aug</small></div><span><strong>{r.clockIn?`${time(r.clockIn)} – ${time(r.clockOut)}`:"Leave"}</strong><small>{r.workedMinutes?`${Math.floor(r.workedMinutes/60)}h ${r.workedMinutes%60}m worked`:r.status.replaceAll("_"," ")}</small></span><Status value={r.status}/></div>)}
		</section>
	</>;
}

function EmployeeLeave({records,balances}:{records:Leave[];balances:Balance[]}){return <><PageHeader eyebrow="Self-service" title="Leave" description="Plan time away and track every request."/><div className="balance-scroll">{balances.map((b)=><article key={b.leaveTypeId}><span>{b.name}</span><strong>{b.paid?b.allocatedDays-b.usedDays:"—"}</strong><small>{b.paid?"days available":"No fixed balance"}</small></article>)}</div><div className="leave-self-grid"><section className="surface"><div className="section-head"><h2>Request history</h2></div>{records.map((r)=><div className="history-row" key={r.id}><div className="date-tile"><b>{new Date(`${r.startDate}T00:00:00`).getDate()}</b><small>Aug</small></div><span><strong>{r.typeName}</strong><small>{r.days} day{r.days===1?"":"s"} · {r.reason}</small></span><Status value={r.status}/></div>)}</section><Form method="post" className="surface leave-form"><div><p className="eyebrow">New request</p><h2>Take time with confidence</h2></div><input type="hidden" name="intent" value="apply-leave"/><label>Leave type<select name="leaveTypeId"><option value="leave-annual">Annual leave</option><option value="leave-medical">Medical leave</option><option value="leave-unpaid">Unpaid leave</option></select></label><div className="form-pair"><label>From<input type="date" name="startDate" defaultValue="2026-08-28"/></label><label>To<input type="date" name="endDate" defaultValue="2026-08-28"/></label></div><label>Reason<textarea name="reason" placeholder="Add a brief reason" required/></label><button className="button primary wide">Submit request</button></Form></div></>}

function Payslips({slips}:{slips:Payslip[]}){return <><PageHeader eyebrow="Self-service" title="Payslips" description="Your protected, finalised payroll records."/><section className="payslip-list">{slips.length?slips.map((s)=><Link className="surface payslip-row" to={`/employee/payslips/${s.id}`} key={s.id}><div className="document-icon"><FileText/></div><span><strong>{date(`${s.period}-01`,{month:"long",year:"numeric"})}</strong><small>Paid {date(s.payDate)}</small></span><span><small>Net pay</small><strong>{money(s.netPaySen)}</strong></span><Status value="finalised"/><ChevronRight/></Link>):<Empty title="No payslips yet" body="Finalised payroll records will appear here."/>}</section></>}

function PayslipDetail({slip}:{slip?:Payslip}){if(!slip)return <Empty title="Payslip not found" body="You do not have access to this record."/>;const b=JSON.parse(slip.breakdownJson) as PayrollBreakdown;return <><PageHeader eyebrow="Payslips / Detail" title={`${date(`${slip.period}-01`,{month:"long",year:"numeric"})} payslip`} description={`Merdeka Coffee · paid ${date(slip.payDate)}`} action={<a className="button primary" href={`/resources/payslips/${slip.id}.pdf`}><Download/>Download PDF</a>}/><section className="payslip-paper"><div className="payslip-brand"><div className="wordmark"><span>W1</span> Workforce One</div><div><strong>Merdeka Coffee Sdn. Bhd.</strong><small>Document issuer · 202001028884</small></div></div><div className="net-block"><span>Net pay</span><strong>{money(slip.netPaySen)}</strong><small>Finalised · immutable payroll snapshot</small></div><div className="payslip-columns"><dl><h3>Earnings</h3><div><dt>Base pay</dt><dd>{money(b.basePaySen)}</dd></div><div><dt>Overtime</dt><dd>{money(b.overtimePaySen)}</dd></div><div><dt>Allowances</dt><dd>{money(b.allowanceSen)}</dd></div><div className="total"><dt>Gross pay</dt><dd>{money(slip.grossPaySen)}</dd></div></dl><dl><h3>Deductions</h3><div><dt>EPF</dt><dd>{money(b.epfEmployeeSen)}</dd></div><div><dt>SOCSO</dt><dd>{money(b.socsoEmployeeSen)}</dd></div><div><dt>EIS</dt><dd>{money(b.eisEmployeeSen)}</dd></div><div><dt>PCB</dt><dd>{money(b.pcbSen)}</dd></div><div className="total"><dt>Total deductions</dt><dd>{money(slip.totalDeductionsSen)}</dd></div></dl></div><p className="payslip-note">Generated from the finalised payroll record. PCB values reflect verified tax schedules.</p></section></>}

function EmployeeProfile({employee}:{employee:Employee}){
	return <>
		<PageHeader eyebrow="Self-service" title="Profile" description="Your personal and employment details." action={<a className="button primary" href="#edit-contact"><Plus/>Edit contact</a>}/>
		<div className="profile-grid">
			<section className="surface profile-card">
				<div className="profile-hero">
					<i>{initials(employee.fullName)}</i>
					<div>
						<h2>{employee.fullName}</h2>
						<p>{employee.position}</p>
						<Status value={employee.status}/>
					</div>
				</div>
				<dl>
					<div><dt>Employee ID</dt><dd>{employee.employeeCode}</dd></div>
					<div><dt>Email</dt><dd>{employee.email}</dd></div>
					<div><dt>Phone</dt><dd>{employee.phone}</dd></div>
					<div><dt>MyKad / IC</dt><dd>{employee.icNumber || "—"}</dd></div>
					<div><dt>EPF Member No</dt><dd>{employee.epfNumber || "—"}</dd></div>
				</dl>
			</section>
			<section className="surface detail-list">
				<div className="section-head"><h2>Employment & banking</h2></div>
				<dl>
					<div><dt>Company</dt><dd>Merdeka Coffee Sdn. Bhd.</dd></div>
					<div><dt>Department</dt><dd>{employee.department}</dd></div>
					<div><dt>Joined</dt><dd>{date(employee.startDate)}</dd></div>
					<div><dt>Pay basis</dt><dd>{employee.salaryType}</dd></div>
					<div><dt>Disbursement Bank</dt><dd>{employee.bankName || "Maybank"} · {employee.bankAccountNumber || "—"}</dd></div>
					<div><dt>Statutory profile</dt><dd>Malaysia Standard · under 60</dd></div>
				</dl>
			</section>
		</div>

		<details id="edit-contact" className="surface employee-form" style={{marginTop:"20px"}}>
			<summary>Update contact details <ChevronRight/></summary>
			<Form method="post" className="form-stack" style={{marginTop:"12px"}}>
				<input type="hidden" name="intent" value="update-self-profile"/>
				<div className="form-pair">
					<label>Email address
						<input name="email" type="email" defaultValue={employee.email} required/>
					</label>
					<label>Phone number
						<input name="phone" defaultValue={employee.phone} required/>
					</label>
				</div>
				<button className="button primary">Save contact updates</button>
			</Form>
		</details>
	</>;
}
