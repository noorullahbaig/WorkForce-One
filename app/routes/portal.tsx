import { finalisePayroll } from '../features/payroll/finalise.server';
import { attendanceClockAction } from '../features/attendance/clock.server';
import {
	ActionToast,
	Empty,
	NavigationFeedback,
	PageHeader,
	PendingButton,
	Status,
	TaskWorkspace,
	ScrollableRegion,
	WorkspaceHeader,
	WorkspaceToolbar,
} from '../components/portal-ui';
import { AttendancePage, Simulator, EmployeeAttendance } from '../features/attendance/attendance-ui';
import { AdminCorrections } from '../features/attendance/correction-ui';
import { listCorrections, submitCorrection, reviewCorrection } from '../features/attendance/corrections.server';
import type { Attendance, CorrectionRequest } from '../features/attendance/types';
import { aggregateAttendance } from '../features/payroll/attendance-inputs';
import { PayrollEmployeeReview } from '../features/payroll/payroll-employee-review';
import { ProductTour } from '../features/onboarding/product-tour';
import { EmployeeForm } from '../features/people/employee-form';
import { AppNavigation } from '../components/app-navigation';
import {
	Form, Link, redirect, useActionData, useLoaderData, useLocation, useNavigation, useSearchParams,
} from "react-router";
import {
	Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Coffee, Compass, Download,
	FileText, Fingerprint, Landmark, LogOut, Menu, Plus,
	RotateCcw, Search, ShieldCheck, Trash2, UserCheck,
	UserMinus, UserRound, Users, WalletCards, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { calculateLeaveDurationHalfDays, calculateProjectedBalance, type LeaveDayPart } from "../domain/leave";
import { getLeaveDatePolicyError } from "../domain/leave";
import { cloudflareContext } from "../context";
import { type PayrollBreakdown } from "../domain/payroll";
import {
	AdminLeaveWorkspace,
	BalanceAdmin,
	EmployeeLeaveWorkspace,
	HolidayAdmin,
	type HolidayRecord,
	type LeaveBalanceSummary,
	type LeaveRecord,
	type SharedLeaveRecord,
} from "../features/leave/leave-ui";
import { date, initials, money, time } from "../lib/format";
import { todayInTimeZone } from "../lib/date";
import { assertSameOrigin, requireUser, type DemoUser } from "../services/auth.server";
import { resetDemoData } from "../services/reset.server";
import type { Route } from "./+types/portal";

type Employee = { id:string; employeeCode:string; fullName:string; email:string; phone:string; department:string; position:string; employmentType:string; salaryType:"monthly"|"hourly"; monthlySalarySen:number|null; hourlyRateSen:number|null; startDate:string; status:string; icNumber:string|null; epfNumber:string|null; taxNumber:string|null; bankName:string|null; bankAccountNumber:string|null };
type Leave = LeaveRecord;
type SharedLeave = SharedLeaveRecord;
type Holiday = HolidayRecord;
type Payroll = { id:string; period:string; periodStart:string; periodEnd:string; payDate:string; status:string; grossTotalSen:number; deductionTotalSen:number; netTotalSen:number; employerContributionTotalSen:number; finalisedAt:string|null; policyName:string };
type Payslip = { id:string; payrollRunId:string; employeeId:string; fullName:string; period:string; payDate:string; grossPaySen:number; totalDeductionsSen:number; netPaySen:number; breakdownJson:string };
type Notification = { id:string; title:string; body:string; href:string|null; readAt:string|null; createdAt:string };
type Balance = LeaveBalanceSummary;
type PayrollAdjustment = { id:string; payrollRunId:string; employeeId:string; fullName:string; type:"allowance"|"bonus"|"deduction"|"pcb"; description:string; amountSen:number; reason:string|null; createdAt:string };
type PolicyRecord = { id:string; name:string; effectiveFrom:string; verificationDate:string; normalDayMinutes:number; overtimeMultiplierBasisPoints:number; active:number };
type CompanyInfo = { id:string; name:string; registrationNumber:string; timezone:string; leaveBackdateDays:number };

export const meta = () => [{ title: "PayME · Merdeka Coffee" }];

async function all<T>(statement: D1PreparedStatement) { return (await statement.all<T>()).results; }

export async function loader({ request, context }: Route.LoaderArgs) {
	const env = context.get(cloudflareContext).env;
	const admin = new URL(request.url).pathname.startsWith("/admin");
	const user = await requireUser(request, env, admin ? "admin" : "employee");
	const employeeScope = admin ? " WHERE e.company_id = ?" : " WHERE e.id = ? AND e.company_id = ?";
	const bind = <T extends D1PreparedStatement>(statement: T) => admin ? statement.bind(user.companyId) : statement.bind(user.employeeId,user.companyId);
	const [employees, attendance, leave, sharedLeave, holidays, payrolls, payslips, notifications, balances, adjustments, policies, companyInfo, corrections] = await Promise.all([
		all<Employee>(bind(env.DB.prepare(`SELECT e.id, e.employee_code employeeCode, e.full_name fullName, e.email, e.phone, e.department, e.position, e.employment_type employmentType, e.salary_type salaryType, e.monthly_salary_sen monthlySalarySen, e.hourly_rate_sen hourlyRateSen, e.start_date startDate, e.status, e.ic_number icNumber, e.epf_number epfNumber, e.tax_number taxNumber, e.bank_name bankName, e.bank_account_number bankAccountNumber FROM employees e${employeeScope} ORDER BY e.full_name`))),
		all<Attendance>(bind(env.DB.prepare(`SELECT a.id, a.employee_id employeeId, e.full_name fullName, e.employee_code employeeCode, a.work_date workDate, a.clock_in clockIn, a.clock_out clockOut, a.clock_in_method clockInMethod, a.clock_out_method clockOutMethod, a.worked_minutes workedMinutes, a.overtime_minutes overtimeMinutes, a.status, a.updated_at updatedAt FROM attendance_records a JOIN employees e ON e.id=a.employee_id${employeeScope} ORDER BY a.work_date DESC, e.full_name`))),
		all<Leave>(bind(env.DB.prepare(`SELECT l.id, l.employee_id employeeId, e.full_name fullName, e.department, l.leave_type_id leaveTypeId, t.name typeName, t.paid, l.start_date startDate, l.end_date endDate, l.duration_half_days durationHalfDays, l.day_part dayPart, l.reason, l.status, l.created_at createdAt, l.reviewed_at reviewedAt, l.review_note reviewNote FROM leave_requests l JOIN employees e ON e.id=l.employee_id JOIN leave_types t ON t.id=l.leave_type_id${employeeScope} ORDER BY l.created_at DESC`))),
		all<SharedLeave>(env.DB.prepare("SELECT l.id,l.employee_id employeeId,e.full_name fullName,e.department,l.start_date startDate,l.end_date endDate FROM leave_requests l JOIN employees e ON e.id=l.employee_id WHERE e.company_id=? AND l.status='approved' ORDER BY l.start_date,e.full_name").bind(user.companyId)),
		all<Holiday>(env.DB.prepare("SELECT id,name,date,category,region,observed,active FROM holidays WHERE company_id=? ORDER BY date,name").bind(user.companyId)),
		all<Payroll>(env.DB.prepare(`SELECT r.id, r.period, r.period_start periodStart, r.period_end periodEnd, r.pay_date payDate, r.status, r.gross_total_sen grossTotalSen, r.deduction_total_sen deductionTotalSen, r.net_total_sen netTotalSen, r.employer_contribution_total_sen employerContributionTotalSen, r.finalised_at finalisedAt, p.name policyName FROM payroll_runs r JOIN payroll_policies p ON p.id=r.policy_id WHERE r.company_id=? ORDER BY r.period DESC`).bind(user.companyId)),
		all<Payslip>(bind(env.DB.prepare(`SELECT p.id, p.payroll_run_id payrollRunId, p.employee_id employeeId, e.full_name fullName, r.period, r.pay_date payDate, pr.gross_pay_sen grossPaySen, pr.total_deductions_sen totalDeductionsSen, pr.net_pay_sen netPaySen, pr.breakdown_json breakdownJson FROM payslips p JOIN employees e ON e.id=p.employee_id JOIN payroll_runs r ON r.id=p.payroll_run_id JOIN payroll_results pr ON pr.id=p.payroll_result_id${employeeScope} ORDER BY r.period DESC`))),
		all<Notification>(env.DB.prepare(`SELECT id,title,body,href,read_at readAt,created_at createdAt FROM notifications WHERE user_id=? ORDER BY created_at DESC`).bind(user.id)),
		all<Balance>(bind(env.DB.prepare(`SELECT b.employee_id employeeId,b.leave_type_id leaveTypeId,t.name,t.paid,b.allocated_half_days allocatedHalfDays,COALESCE((SELECT SUM(a.delta_half_days) FROM leave_balance_adjustments a WHERE a.employee_id=b.employee_id AND a.leave_type_id=b.leave_type_id),0) adjustmentHalfDays,COALESCE((SELECT SUM(l.duration_half_days) FROM leave_requests l WHERE l.employee_id=b.employee_id AND l.leave_type_id=b.leave_type_id AND l.status='approved'),0) approvedHalfDays,COALESCE((SELECT SUM(l.duration_half_days) FROM leave_requests l WHERE l.employee_id=b.employee_id AND l.leave_type_id=b.leave_type_id AND l.status='pending'),0) pendingHalfDays FROM leave_balances b JOIN leave_types t ON t.id=b.leave_type_id JOIN employees e ON e.id=b.employee_id${employeeScope} ORDER BY e.full_name,t.name`))),
		all<PayrollAdjustment>(bind(env.DB.prepare(`SELECT a.id, a.payroll_run_id payrollRunId, a.employee_id employeeId, e.full_name fullName, a.type, a.description, a.amount_sen amountSen, a.reason, a.created_at createdAt FROM payroll_adjustments a JOIN employees e ON e.id=a.employee_id${employeeScope} ORDER BY a.created_at DESC`))),
		all<PolicyRecord>(env.DB.prepare(`SELECT id, name, effective_from effectiveFrom, verification_date verificationDate, normal_day_minutes normalDayMinutes, overtime_multiplier_basis_points overtimeMultiplierBasisPoints, active FROM payroll_policies WHERE company_id=? ORDER BY created_at DESC`).bind(user.companyId)),
		env.DB.prepare("SELECT id, name, registration_number registrationNumber, timezone, leave_backdate_days leaveBackdateDays FROM companies WHERE id=?").bind(user.companyId).first<CompanyInfo>(),
		listCorrections(env.DB,user),
	]);
	const resolvedCompanyInfo = companyInfo ?? { id: "company-merdeka", name: "Merdeka Coffee Sdn. Bhd.", registrationNumber: "202001028884", timezone: "Asia/Kuala_Lumpur", leaveBackdateDays: 3 };
	return {
		user, admin, company: "Merdeka Coffee",
		companyInfo: resolvedCompanyInfo,
		today: todayInTimeZone(new Date(), resolvedCompanyInfo.timezone),
		employees, attendance, leave, sharedLeave, holidays, payrolls, payslips, notifications, balances, adjustments, policies, corrections,
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	assertSameOrigin(request);
	const env = context.get(cloudflareContext).env;
	const adminPath = new URL(request.url).pathname.startsWith("/admin");
	const user = await requireUser(request, env, adminPath ? "admin" : "employee");
	const data = Object.fromEntries(await request.formData());
	const intent = String(data.intent ?? "");
	if(intent==='request-attendance-correction') return submitCorrection(env.DB,user,{attendanceId:String(data.attendanceId??''),clockIn:String(data.clockIn??''),clockOut:String(data.clockOut??''),reason:String(data.reason??'')});
 if(intent==='review-attendance-correction') return reviewCorrection(env.DB,user,String(data.id??''),String(data.decision??''),String(data.rejectionReason??''));
 const now = new Date().toISOString();
	const companySettings = await env.DB.prepare("SELECT timezone, leave_backdate_days leaveBackdateDays FROM companies WHERE id=?").bind(user.companyId).first<{timezone:string;leaveBackdateDays:number}>();
	const today = todayInTimeZone(new Date(), companySettings?.timezone ?? "Asia/Kuala_Lumpur");
	const leaveBackdateDays = Math.max(0, Math.floor(companySettings?.leaveBackdateDays ?? 3));

	if (intent === "read-notification") {
		await env.DB.prepare("UPDATE notifications SET read_at=? WHERE id=? AND user_id=?").bind(now, data.id, user.id).run();
		return { ok: "Notification marked as read." };
	}
	if (intent === "read-all-notifications") {
		await env.DB.prepare("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL").bind(now, user.id).run();
		return { ok: "All notifications marked as read." };
	}
	if (intent === "apply-leave" && user.employeeId) {
		const start = String(data.startDate); const end = String(data.endDate); const reason = String(data.reason ?? "").trim();
		const dayPart:LeaveDayPart = data.dayPart === "morning" || data.dayPart === "afternoon" ? data.dayPart : "full";
		if (!reason) return { error: "Choose valid dates and add a reason." };
		const policyError = getLeaveDatePolicyError(start, today, leaveBackdateDays);
		if (policyError) return { error: policyError };
		const leaveType = await env.DB.prepare("SELECT id,paid FROM leave_types WHERE id=? AND company_id=?").bind(data.leaveTypeId,user.companyId).first<{id:string;paid:number}>();
		if (!leaveType) return { error: "Choose a valid leave type." };
		const holidayRows = await all<{date:string}>(env.DB.prepare("SELECT date FROM holidays WHERE company_id=? AND active=1 AND date BETWEEN ? AND ?").bind(user.companyId,start,end));
		let duration;
		try { duration = calculateLeaveDurationHalfDays({ startDate:start, endDate:end, dayPart, holidayDates:holidayRows.map((row)=>row.date) }); }
		catch (error) { return { error:error instanceof Error ? error.message : "Choose valid leave dates." }; }
		
		const requestId = crypto.randomUUID();
		const insertResult = await env.DB.prepare(`
			INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, duration_half_days, day_part, reason, status, created_at, updated_at)
			SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?
			WHERE NOT EXISTS (
				SELECT 1 FROM leave_requests l2 
				WHERE l2.employee_id = ? AND l2.status IN ('pending', 'approved') 
				AND l2.start_date <= ? AND l2.end_date >= ?
			)
			AND (
				? = 0 OR ? <= (
					SELECT b.allocated_half_days + 
						COALESCE((SELECT SUM(a.delta_half_days) FROM leave_balance_adjustments a WHERE a.employee_id = b.employee_id AND a.leave_type_id = b.leave_type_id), 0) - 
						COALESCE((SELECT SUM(l.duration_half_days) FROM leave_requests l WHERE l.employee_id = b.employee_id AND l.leave_type_id = b.leave_type_id AND l.status IN ('approved', 'pending')), 0)
					FROM leave_balances b WHERE b.employee_id = ? AND b.leave_type_id = ?
				)
			)
			RETURNING id
		`).bind(
			requestId, user.employeeId, leaveType.id, start, end, duration.durationHalfDays, dayPart, reason, now, now,
			user.employeeId, end, start,
			leaveType.paid, duration.durationHalfDays, user.employeeId, leaveType.id
		).first<{id:string}>();

		if (!insertResult) return { error: "Request failed: dates overlap an existing request or you have insufficient projected balance." };

		await env.DB.batch([
			env.DB.prepare("INSERT INTO notifications (id,user_id,title,body,href,created_at) VALUES (?,'user-admin','Leave request needs review',?,'/admin/leave',?)").bind(crypto.randomUUID(),`${user.name} requested ${duration.durationHalfDays/2} day${duration.durationHalfDays===2?"":"s"} of leave.`,now),
			env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,'leave.submitted','leave_request',?,?,?)").bind(crypto.randomUUID(),user.companyId,user.id,requestId,JSON.stringify({durationHalfDays:duration.durationHalfDays,excludedDates:duration.excludedDates}),now),
		]);
		return redirect(`/employee/leave?month=${start.slice(0, 7)}&date=${start}&notice=leave-submitted`);
	}
	if (intent === "withdraw-leave" && user.employeeId) {
		const result=await env.DB.prepare("UPDATE leave_requests SET status='withdrawn',cancelled_by=?,cancelled_at=?,updated_at=? WHERE id=? AND employee_id=? AND status='pending'").bind(user.id,now,now,data.id,user.employeeId).run();
		if (!result.meta.changes) return { error:"Only pending leave requests can be withdrawn." };
		await env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,'leave.withdrawn','leave_request',?,'{}',?)").bind(crypto.randomUUID(),user.companyId,user.id,data.id,now).run();
		return { ok:"Leave request withdrawn." };
	}
	if (intent === "employee-clock") return attendanceClockAction(env,user,intent,data,today,now);
	if (intent === "update-self-profile" && user.employeeId) {
		const phone = String(data.phone ?? "").trim();
		const email = String(data.email ?? "").trim();
		const bankAccountNumber = String(data.bankAccountNumber ?? "").trim();
		if (!phone || !email) return { error: "Please provide a valid phone number and email address." };
		await env.DB.batch([
			env.DB.prepare("UPDATE employees SET phone=?, email=?, bank_account_number=?, updated_at=? WHERE id=?").bind(phone, email, bankAccountNumber || null, now, user.employeeId),
			env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,'company-merdeka',?,'employee.self_update','employee',?,'{}',?)").bind(crypto.randomUUID(), user.id, user.employeeId, now),
		]);
		return { ok: "Profile information updated successfully." };
	}

	if (!adminPath) throw new Response("Forbidden", { status: 403 });

	if (intent === "update-leave-policy") {
		const days = Number(data.leaveBackdateDays);
		if (!Number.isInteger(days) || days < 0 || days > 365) return { error: "Enter a whole number of days from 0 to 365." };
		await env.DB.batch([
			env.DB.prepare("UPDATE companies SET leave_backdate_days=?, updated_at=? WHERE id=?").bind(days, now, user.companyId),
			env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,'company.leave_policy_updated','company',?,?,?)").bind(crypto.randomUUID(), user.companyId, user.id, user.companyId, JSON.stringify({ leaveBackdateDays: days }), now),
		]);
		return { ok: "Leave policy updated." };
	}

	if (intent === "review-leave") {
		const decision = data.decision === "approved" ? "approved" : "rejected";
		const reviewNote=String(data.reviewNote??"").trim();
		if(decision==="rejected"&&!reviewNote)return {error:"Add a decision note before rejecting this request."};
		const record = await env.DB.prepare("SELECT l.employee_id employeeId,l.leave_type_id leaveTypeId,l.duration_half_days durationHalfDays,l.status,t.paid FROM leave_requests l JOIN employees e ON e.id=l.employee_id JOIN leave_types t ON t.id=l.leave_type_id WHERE l.id=? AND e.company_id=?").bind(data.id,user.companyId).first<{employeeId:string;leaveTypeId:string;durationHalfDays:number;status:string;paid:number}>();
		if (!record || record.status !== "pending") return { error: "This request has already been reviewed." };
		if(decision==="approved"&&record.paid){const balance=await env.DB.prepare("SELECT b.allocated_half_days allocatedHalfDays,COALESCE((SELECT SUM(a.delta_half_days) FROM leave_balance_adjustments a WHERE a.employee_id=b.employee_id AND a.leave_type_id=b.leave_type_id),0) adjustmentHalfDays,COALESCE((SELECT SUM(l.duration_half_days) FROM leave_requests l WHERE l.employee_id=b.employee_id AND l.leave_type_id=b.leave_type_id AND l.status='approved'),0) approvedHalfDays FROM leave_balances b WHERE b.employee_id=? AND b.leave_type_id=?").bind(record.employeeId,record.leaveTypeId).first<{allocatedHalfDays:number;adjustmentHalfDays:number;approvedHalfDays:number}>();if(!balance||record.durationHalfDays>balance.allocatedHalfDays+balance.adjustmentHalfDays-balance.approvedHalfDays)return {error:"The employee no longer has enough leave balance for this request."}}
		const result=await env.DB.prepare("UPDATE leave_requests SET status=?,reviewed_by=?,reviewed_at=?,review_note=?,updated_at=? WHERE id=? AND status='pending'").bind(decision,user.id,now,reviewNote||null,now,data.id).run();
		if(!result.meta.changes)return {error:"This request has already been reviewed."};
		await env.DB.batch([
			env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,?, 'leave_request',?,?,?)").bind(crypto.randomUUID(),user.companyId,user.id,`leave.${decision}`,data.id,JSON.stringify({durationHalfDays:record.durationHalfDays,note:reviewNote||null}),now),
			env.DB.prepare("INSERT INTO notifications (id,user_id,title,body,href,created_at) SELECT ?,u.id,?,?, '/employee/leave',? FROM users u WHERE u.employee_id=? AND u.company_id=?").bind(crypto.randomUUID(),decision==="approved"?"Leave request approved":"Leave request declined",decision==="approved"?"Your leave request has been approved.":`Your leave request was declined: ${reviewNote}`,now,record.employeeId,user.companyId),
		]);
		return { ok: `Leave request ${decision}.` };
	}
	if(intent==="cancel-approved-leave"){
		const note=String(data.reviewNote??"").trim();if(!note)return {error:"Add a cancellation reason."};
		const record=await env.DB.prepare("SELECT l.employee_id employeeId,l.status FROM leave_requests l JOIN employees e ON e.id=l.employee_id WHERE l.id=? AND e.company_id=?").bind(data.id,user.companyId).first<{employeeId:string;status:string}>();
		if(!record||record.status!=="approved")return {error:"Only approved leave can be cancelled."};
		const result=await env.DB.prepare("UPDATE leave_requests SET status='cancelled',cancelled_by=?,cancelled_at=?,review_note=?,updated_at=? WHERE id=? AND status='approved'").bind(user.id,now,note,now,data.id).run();if(!result.meta.changes)return {error:"This leave has already been changed."};
		await env.DB.batch([env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,'leave.cancelled','leave_request',?,?,?)").bind(crypto.randomUUID(),user.companyId,user.id,data.id,JSON.stringify({reason:note}),now),env.DB.prepare("INSERT INTO notifications (id,user_id,title,body,href,created_at) SELECT ?,u.id,'Approved leave cancelled',?,'/employee/leave',? FROM users u WHERE u.employee_id=? AND u.company_id=?").bind(crypto.randomUUID(),`An approved leave request was cancelled: ${note}`,now,record.employeeId,user.companyId)]);
		return {ok:"Approved leave cancelled and balance restored."};
	}
	if(intent==="save-holiday"){
		const name=String(data.name??"").trim(),holidayDate=String(data.date??"");if(!name||!/^(\d{4})-(\d{2})-(\d{2})$/.test(holidayDate)||holidayDate<=today)return {error:"Add a future holiday date and name."};
		const overlap=await env.DB.prepare("SELECT id FROM leave_requests l JOIN employees e ON e.id=l.employee_id WHERE e.company_id=? AND l.status IN ('pending','approved') AND l.start_date<=? AND l.end_date>=? LIMIT 1").bind(user.companyId,holidayDate,holidayDate).first();if(overlap)return {error:"This date already affects a pending or approved leave request."};
		const id=crypto.randomUUID();await env.DB.batch([env.DB.prepare("INSERT INTO holidays (id,company_id,name,date,category,region,observed,active,created_at,updated_at) VALUES (?,?,?,?,'company','MY-PENANG',0,1,?,?)").bind(id,user.companyId,name,holidayDate,now,now),env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,'holiday.created','holiday',?,?,?)").bind(crypto.randomUUID(),user.companyId,user.id,id,JSON.stringify({name,date:holidayDate}),now)]);return {ok:"Company holiday added."};
	}
	if(intent==="archive-holiday"){
		const holiday=await env.DB.prepare("SELECT id,date,category,active FROM holidays WHERE id=? AND company_id=?").bind(data.id,user.companyId).first<{id:string;date:string;category:string;active:number}>();if(!holiday||holiday.category!=="company"||!holiday.active||holiday.date<=today)return {error:"Only future company holidays can be archived."};const overlap=await env.DB.prepare("SELECT id FROM leave_requests l JOIN employees e ON e.id=l.employee_id WHERE e.company_id=? AND l.status IN ('pending','approved') AND l.start_date<=? AND l.end_date>=? LIMIT 1").bind(user.companyId,holiday.date,holiday.date).first();if(overlap)return {error:"This holiday affects an existing leave request and cannot be archived."};await env.DB.batch([env.DB.prepare("UPDATE holidays SET active=0,updated_at=? WHERE id=? AND active=1").bind(now,holiday.id),env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,'holiday.archived','holiday',?,'{}',?)").bind(crypto.randomUUID(),user.companyId,user.id,holiday.id,now)]);return {ok:"Company holiday archived."};
	}
	if(intent==="adjust-leave-balance"){
		const employeeId=String(data.employeeId),leaveTypeId=String(data.leaveTypeId),deltaHalfDays=Number(data.deltaHalfDays),reason=String(data.reason??"").trim();if(!reason||!Number.isInteger(deltaHalfDays)||deltaHalfDays===0||Math.abs(deltaHalfDays)>20)return {error:"Choose a valid adjustment and add a reason."};const balance=await env.DB.prepare("SELECT b.allocated_half_days allocatedHalfDays,lt.name leaveTypeName,COALESCE((SELECT SUM(a.delta_half_days) FROM leave_balance_adjustments a WHERE a.employee_id=b.employee_id AND a.leave_type_id=b.leave_type_id),0) adjustmentHalfDays,COALESCE((SELECT SUM(l.duration_half_days) FROM leave_requests l WHERE l.employee_id=b.employee_id AND l.leave_type_id=b.leave_type_id AND l.status='approved'),0) approvedHalfDays,COALESCE((SELECT SUM(l.duration_half_days) FROM leave_requests l WHERE l.employee_id=b.employee_id AND l.leave_type_id=b.leave_type_id AND l.status='pending'),0) pendingHalfDays FROM leave_balances b JOIN leave_types lt ON lt.id=b.leave_type_id JOIN employees e ON e.id=b.employee_id WHERE b.employee_id=? AND b.leave_type_id=? AND e.company_id=?").bind(employeeId,leaveTypeId,user.companyId).first<{allocatedHalfDays:number;leaveTypeName?:string;adjustmentHalfDays:number;approvedHalfDays:number;pendingHalfDays:number}>();if(!balance)return {error:"Leave balance not found."};const projectedHalfDays=calculateProjectedBalance(balance).projectedHalfDays;if(projectedHalfDays+deltaHalfDays<0)return {error:"This adjustment would make the projected balance negative."};const id=crypto.randomUUID();const deltaDays=deltaHalfDays/2;const deltaFormatted=deltaDays>0?`+${deltaDays}`:`${deltaDays}`;const dayWord=Math.abs(deltaDays)===1?"day":"days";const newProjectedDays=(projectedHalfDays+deltaHalfDays)/2;const leaveName=balance.leaveTypeName||"leave";const notificationBody=`Your ${leaveName} balance was adjusted by ${deltaFormatted} ${dayWord} (${reason}). New balance: ${newProjectedDays} ${newProjectedDays===1?"day":"days"}.`;await env.DB.batch([env.DB.prepare("INSERT INTO leave_balance_adjustments (id,employee_id,leave_type_id,delta_half_days,reason,actor_user_id,created_at) VALUES (?,?,?,?,?,?,?)").bind(id,employeeId,leaveTypeId,deltaHalfDays,reason,user.id,now),env.DB.prepare("INSERT INTO audit_events (id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,'leave.balance_adjusted','leave_balance',?,?,?)").bind(crypto.randomUUID(),user.companyId,user.id,`${employeeId}:${leaveTypeId}`,JSON.stringify({deltaHalfDays,reason}),now),env.DB.prepare("INSERT INTO notifications (id,user_id,title,body,href,created_at) SELECT ?,u.id,'Leave balance updated',?,'/employee/leave',? FROM users u WHERE u.employee_id=? AND u.company_id=?").bind(crypto.randomUUID(),notificationBody,now,employeeId,user.companyId)]);return {ok:"Leave balance adjusted."};
	}
	if (intent === "simulate-attendance") return attendanceClockAction(env,user,intent,data,today,now);
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


export default function Portal() {
	const data=useLoaderData<typeof loader>(); const location=useLocation(); const actionData=useActionData<typeof action>(); const navigation=useNavigation();
	const [tourReplay, setTourReplay] = useState(0);
	const [tourOpen, setTourOpen] = useState(false);
	const [railCollapsed, setRailCollapsed] = useState(false);
	const path=location.pathname; const busy=navigation.state!=="idle";
	const intent = String(navigation.formData?.get("intent") ?? "");
	return <div className="app-shell" data-navigation={navigation.state} data-navigation-rail={railCollapsed?"collapsed":"expanded"}>
		<AppNavigation admin={data.admin} user={data.user} unread={data.notifications.filter((item)=>!item.readAt).length} forceExpanded={tourOpen} onCollapsedChange={setRailCollapsed}/>
		<main className={busy?"workspace is-navigating":"workspace"} aria-busy={busy}>
			<header className="topbar">
				<div>
					<MobileMenu admin={data.admin}/>
					<CompanyDropdown companyInfo={data.companyInfo} employeeCount={data.employees.length}/>
				</div>
				<div className="top-actions">
					<Link data-tour={data.admin?undefined:"employee-notifications"} to={data.admin?"/admin/notifications":"/employee/notifications"} aria-label="Notifications" className="icon-button"><Bell/>{data.notifications.some((item)=>!item.readAt)&&<i/>}</Link>
					<UserMenu user={data.user} admin={data.admin} onTakeTour={()=>setTourReplay((value)=>value+1)}/>
				</div>
			</header>
			{busy&&<div className="route-progress"/>}
			{busy&&<NavigationFeedback state={navigation.state === "submitting" ? "submitting" : "loading"} intent={intent} destination={navigation.location?.pathname}/>}
			{actionData && ("ok" in actionData || "error" in actionData) && <ActionToast key={"error" in actionData?actionData.error:actionData.ok} result={actionData}/>}
			<div className={busy?"page-wrap":"page-wrap page-arrival"}>{data.admin?<AdminRouter path={path} data={data}/>:<EmployeeRouter path={path} data={data}/>}</div>
		</main>
		<ProductTour role={data.admin?"admin":"employee"} replayToken={tourReplay} onOpenChange={setTourOpen}/>
	</div>;
}

function UserMenu({user, admin, onTakeTour}:{user:DemoUser; admin:boolean;onTakeTour:()=>void}) {
	return <details className="user-popover">
		<summary className="avatar-button" role="button" aria-label="User profile & account">
			<div className="avatar">{initials(user.name)}</div>
		</summary>
		<div className="user-menu">
			<div className="user-menu-header">
				<strong>{user.name}</strong>
				<small>{user.email}</small>
				<span className="user-role-badge">{admin ? "Administrator" : "Employee"}</span>
			</div>
			<div className="user-menu-links">
				{admin ? (
					<Link aria-label="People directory" to="/admin/employees" className="user-menu-item">
						<Users aria-hidden="true" size={15}/><span>People directory</span>
					</Link>
				) : (
					<Link aria-label="My Profile" to="/employee/profile" className="user-menu-item">
						<UserRound aria-hidden="true" size={15}/><span>My Profile</span>
					</Link>
				)}
				<Link aria-label="Notifications" to={admin ? "/admin/notifications" : "/employee/notifications"} className="user-menu-item">
					<Bell aria-hidden="true" size={15}/><span>Notifications</span>
				</Link>
				<button aria-label="Take product tour" type="button" className="user-menu-item" onClick={(event)=>{event.currentTarget.closest("details")?.removeAttribute("open");onTakeTour();}}>
					<Compass aria-hidden="true" size={15}/><span>Take product tour</span>
				</button>
			</div>
			<Form method="post" action="/logout" style={{margin:0}}>
				<button aria-label="Sign out" className="user-menu-logout">
					<LogOut aria-hidden="true" size={15}/><span>Sign out</span>
				</button>
			</Form>
		</div>
	</details>;
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

function MobileMenu({admin}:{admin:boolean}) { const links=admin?[["/admin","Home"],["/admin/employees","People"],["/admin/attendance","Attendance"],["/admin/leave","Leave"],["/admin/payroll","Payroll"],["/admin/payroll/policies","Policies"],["/admin/reports","Reports"],["/admin/notifications","Notifications"]]:[["/employee","Home"],["/employee/attendance","Attendance"],["/employee/leave","Leave"],["/employee/payslips","Payslips"],["/employee/notifications","Notifications"],["/employee/profile","Profile"]]; return <details className="mobile-menu"><summary aria-label="Open navigation" role="button"><Menu/></summary><div className="mobile-menu-sheet"><div><strong>Navigate</strong><span>PayME</span></div><nav>{links.map(([to,label])=><Link key={to} to={to}>{label}<ChevronRight/></Link>)}</nav><Form method="post" action="/logout"><button className="button secondary wide"><LogOut/>Sign out</button></Form></div></details> }

function AdminRouter({path,data}:{path:string;data:Awaited<ReturnType<typeof loader>>}) {
	if(path.includes("/employees/")) return <EmployeeInspector employee={data.employees.find((e)=>path.endsWith(e.id))}/>;
	if(path==="/admin/employees") return <People data={data}/>;
	if(path==="/admin/attendance/simulate") return <Simulator employees={data.employees} attendance={data.attendance} today={data.today}/>;
	if(path==="/admin/attendance/corrections") return <AdminCorrections requests={data.corrections} periods={data.payrolls}/>;
	if(path==="/admin/attendance") return <AttendancePage records={data.attendance} corrections={data.corrections}/>;
	if(path==="/admin/leave/holidays") return <HolidayAdmin holidays={data.holidays} today={data.today}/>;
	if(path==="/admin/leave/balances") return <BalanceAdmin balances={data.balances} employees={data.employees}/>;
	if(path==="/admin/leave") return <AdminLeaveWorkspace records={data.leave} employees={data.employees} holidays={data.holidays} balances={data.balances} today={data.today} backdateDays={data.companyInfo.leaveBackdateDays}/>;
	if(path==="/admin/payroll/policies") return <Policy policies={data.policies}/>;
	if(path.includes("/admin/payroll/")) return <PayrollDetail run={data.payrolls.find((r)=>path.endsWith(r.id))} employees={data.employees} attendance={data.attendance} adjustments={data.adjustments} corrections={data.corrections} payslips={data.payslips}/>;
	if(path==="/admin/payroll") return <PayrollList runs={data.payrolls}/>;
	if(path==="/admin/reports") return <Reports runs={data.payrolls}/>;
	if(path==="/admin/notifications") return <Notifications items={data.notifications}/>;
	return <AdminHome data={data}/>;
}

function AdminHome({data}:{data:Awaited<ReturnType<typeof loader>>}) {
	const pending=data.leave.filter((r)=>r.status==="pending").length;
	const missingRecords=data.attendance.filter((r)=>r.status==="missing_clock_out");
	const pendingCorrections=data.corrections.filter((r)=>r.status==="pending");
	const attendanceBlockers=new Set([...missingRecords.map((r)=>r.id),...pendingCorrections.map((r)=>r.attendanceId)]).size;
	const draft=data.payrolls.find((r)=>r.status==="draft");
	const currentPayroll=draft??data.payrolls[0];
	const payrollPeriod=currentPayroll?date(currentPayroll.periodStart,{month:"long",year:"numeric"}):"Current";
	const payrollState=draft?(attendanceBlockers>0?"Blocked":"Ready to finalise"):"Finalised";
	const latestFinalised=data.payrolls.find((r)=>r.status==="finalised");
	const todayLabel=`${date(data.today,{weekday:"long"})} · ${date(data.today,{day:"numeric",month:"long"})}`;
	return <><PageHeader eyebrow={todayLabel} title={`Good morning, ${data.user.name.split(" ")[0]}`} description="Here’s what needs attention across Merdeka Coffee." action={<Link className="button primary" to="/admin/attendance/simulate"><Fingerprint/>Attendance capture</Link>}/>
		<div className="dashboard-grid"><section className="surface"><div className="section-head"><div><p className="eyebrow">Action queue</p><h2>Needs your attention</h2></div><span className="count">{pending+missingRecords.length+pendingCorrections.length}</span></div>
			{pendingCorrections.length>0&&<Link className="action-row" to="/admin/attendance/corrections"><span className="action-icon warning"><Clock3/></span><span><strong>Review attendance corrections</strong><small>{pendingCorrections.length} request{pendingCorrections.length===1?"":"s"} awaiting a decision</small></span><ChevronRight/></Link>}
			{missingRecords.length>0&&<Link className="action-row" to="/admin/attendance"><span className="action-icon warning"><Clock3/></span><span><strong>Resolve missing clock-outs</strong><small>{missingRecords.length} attendance record{missingRecords.length===1?"":"s"} block payroll finalisation</small></span><ChevronRight/></Link>}
			{pending>0&&<Link className="action-row" to="/admin/leave"><span className="action-icon emerald"><CalendarDays/></span><span><strong>Review leave requests</strong><small>{pending} request waiting for a decision</small></span><ChevronRight/></Link>}
			{draft&&<Link className="action-row" to={`/admin/payroll/${draft.id}`}><span className="action-icon ink"><WalletCards/></span><span><strong>{attendanceBlockers?`${payrollPeriod} payroll is blocked`:`Finalise ${payrollPeriod} payroll`}</strong><small>{attendanceBlockers?"Resolve attendance records before finalising":"Attendance inputs are ready for review"}</small></span><ChevronRight/></Link>}
		</section><section className="surface"><div className="section-head"><div><p className="eyebrow">Payroll readiness</p><h2>{payrollPeriod}</h2></div><Link to={currentPayroll?`/admin/payroll/${currentPayroll.id}`:"/admin/payroll"}>Open run</Link></div><div className="payroll-readiness"><Status value={payrollState}/><p>{draft&&attendanceBlockers?`${attendanceBlockers} attendance record${attendanceBlockers===1?"":"s"} must be resolved before finalisation.`:draft?"Attendance inputs are ready for review.":"No draft run is currently open."}</p></div>{latestFinalised&&<div className="payroll-pulse compact"><span>Latest finalised · {date(latestFinalised.periodStart,{month:"long",year:"numeric"})}</span><strong>{money(latestFinalised.netTotalSen)}</strong><small>Net pay distributed</small><div><span>Gross <b>{money(latestFinalised.grossTotalSen)}</b></span><span>Deductions <b>{money(latestFinalised.deductionTotalSen)}</b></span></div></div>}</section></div>
	</>;
}

function People({data}:{data:Awaited<ReturnType<typeof loader>>}) {
	const [params,setParams]=useSearchParams();
	const query=params.get("q")??"";
	const [showAddForm, setShowAddForm]=useState(false);
	const addEmployeeButtonRef=useRef<HTMLButtonElement>(null);
	const dept=params.get("department")??"all";
	const type=params.get("type")??"all";
	const status=params.get("status")??"all";
	const updateListParam=(name:string,value:string,defaultValue="")=>{
		const next=new URLSearchParams(params);if(value===defaultValue||!value)next.delete(name);else next.set(name,value);setParams(next,{preventScrollReset:true});
	};

	const departments = Array.from(new Set(data.employees.map((e)=>e.department))).sort();
	const hasActiveFilters = dept !== "all" || type !== "all" || status !== "all";

	const filtered = data.employees.filter((e) => {
		const matchesQuery = `${e.fullName} ${e.position} ${e.department} ${e.employeeCode}`.toLowerCase().includes(query.toLowerCase());
		const matchesDept = dept === "all" || e.department === dept;
		const matchesType = type === "all" || e.employmentType === type;
		const matchesStatus = status === "all" || e.status === status;
		return matchesQuery && matchesDept && matchesType && matchesStatus;
	});

	return <TaskWorkspace label="Employee directory" scrollMode="list">
		<WorkspaceHeader eyebrow="People" title="Employee directory" description={`${data.employees.length} people · employment, pay and statutory profiles`} action={<button ref={addEmployeeButtonRef} type="button" className="button primary" onClick={()=>setShowAddForm(true)}><Plus/>Add employee</button>}/>
		<WorkspaceToolbar label="Employee controls">
			<div className="balance-search-pill">
				<Search size={15}/>
				<input
					aria-label="Search employees"
					placeholder="Search name, role or ID…"
					value={query}
					onChange={(e)=>updateListParam("q",e.target.value)}
				/>
				{query && <button type="button" aria-label="Clear search" className="balance-search-clear" onClick={()=>updateListParam("q","")}><X size={13}/></button>}
				<span className="balance-count-badge">{query||hasActiveFilters?`Showing ${filtered.length} of ${data.employees.length}`:`${data.employees.length} employees`}</span>
			</div>
			<div className="people-filter-row">
				<select aria-label="Department" value={dept} onChange={(e)=>updateListParam("department",e.target.value,"all")}>
					<option value="all">All departments</option>
					{departments.map((d)=><option key={d} value={d}>{d}</option>)}
				</select>
				<select aria-label="Employment type" value={type} onChange={(e)=>updateListParam("type",e.target.value,"all")}>
					<option value="all">All types</option>
					<option value="full_time">Full time</option>
					<option value="part_time">Part time</option>
					<option value="contract">Contract</option>
				</select>
				<select aria-label="Status" value={status} onChange={(e)=>updateListParam("status",e.target.value,"all")}>
					<option value="all">All statuses</option>
					<option value="active">Active</option>
					<option value="on_leave">On leave</option>
					<option value="inactive">Inactive</option>
				</select>
				{hasActiveFilters && <button className="text-button" onClick={()=>{const next=new URLSearchParams(params);["department","type","status"].forEach((key)=>next.delete(key));setParams(next,{preventScrollReset:true});}}><RotateCcw size={13}/>Reset</button>}
			</div>
		</WorkspaceToolbar>

		<div className={`people-workspace${showAddForm ? " has-inspector" : ""}`}>
		<ScrollableRegion label="Employee results" className="table surface">
			<div className="table-head"><span>Employee</span><span>Team &amp; role</span><span>Pay profile</span><span>Status</span><span/></div>
			{filtered.length ? filtered.map((e)=><Link className="table-row" to={`/admin/employees/${e.id}?${params.toString()}`} key={e.id}><span className="person"><i>{initials(e.fullName)}</i><span><strong>{e.fullName}</strong><small>{e.employeeCode} · {e.email}</small></span></span><span><strong>{e.department}</strong><small>{e.position}</small></span><span><strong>{e.salaryType==="monthly"?money(e.monthlySalarySen):`${money(e.hourlyRateSen)}/hr`}</strong><small>{e.employmentType.replace("_"," ")}</small></span><Status value={e.status}/><ChevronRight/></Link>) : <Empty title="No matching employees" body="Try adjusting your search or filters."/>}
		</ScrollableRegion>
		<EmployeeForm open={showAddForm} onClose={()=>setShowAddForm(false)} returnFocusRef={addEmployeeButtonRef}/>
		</div>
	</TaskWorkspace>;
}

function EmployeeInspector({employee}:{employee?:Employee}) {
	const [showEdit, setShowEdit] = useState(false);
	const [listParams] = useSearchParams();
	const editEmployeeButtonRef=useRef<HTMLButtonElement>(null);
	if(!employee) return <Empty title="Employee not found" body="This profile is not available."/>;
	return <>
		<PageHeader eyebrow="People / Employee" title={employee.fullName} description={`${employee.employeeCode} · ${employee.position}`} action={
			<>
				<Link className="button secondary" to={`/admin/employees${listParams.toString()?`?${listParams.toString()}`:""}`}>Back</Link>
				<Form method="post" style={{margin:0}}>
					<input type="hidden" name="intent" value="toggle-employee-status"/>
					<input type="hidden" name="employeeId" value={employee.id}/>
					<input type="hidden" name="status" value={employee.status === "inactive" ? "active" : "inactive"}/>
					<button className={`button ${employee.status === "inactive" ? "primary" : "ghost"}`}>
						{employee.status === "inactive" ? <><UserCheck size={16}/> Activate</> : <><UserMinus size={16}/> Deactivate</>}
					</button>
				</Form>
				<button ref={editEmployeeButtonRef} type="button" className="button primary" onClick={()=>setShowEdit(true)}>Edit profile</button>
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
		<EmployeeForm employee={employee} open={showEdit} onClose={()=>setShowEdit(false)} returnFocusRef={editEmployeeButtonRef}/>
	</>;
}

function PayrollList({runs}:{runs:Payroll[]}) {
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

	const filteredRuns = runs.filter((r) => {
		const periodName = date(r.periodStart, { month: "long", year: "numeric" }).toLowerCase();
		const policy = r.policyName.toLowerCase();
		const matchesQuery = !query || periodName.includes(query.toLowerCase()) || policy.includes(query.toLowerCase());
		const matchesStatus = statusFilter === "all" || r.status === statusFilter;
		return matchesQuery && matchesStatus;
	});

	return <TaskWorkspace label="Payroll runs" scrollMode="list">
		<WorkspaceHeader eyebrow="Payroll" title="Payroll runs" description="Review calculation inputs and finalised payroll records." action={<Link className="button secondary" to="/admin/payroll/policies"><ShieldCheck/>Statutory policy</Link>}/>
		<WorkspaceToolbar label="Payroll run controls">
			<div className="balance-search-pill">
				<Search size={15} />
				<input
					aria-label="Search payroll runs"
					placeholder="Search month or policy…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
				{query && (
					<button
						type="button"
						aria-label="Clear search"
						className="balance-search-clear"
						onClick={() => setQuery("")}
					>
						<X size={13} />
					</button>
				)}
				<span className="balance-count-badge">
					{query || statusFilter !== "all"
						? `Showing ${filteredRuns.length} of ${runs.length}`
						: `${runs.length} runs`}
				</span>
			</div>
			<div className="people-filter-row">
				<select
					aria-label="Filter status"
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
				>
					<option value="all">All statuses</option>
					<option value="draft">Draft</option>
					<option value="finalised">Finalised</option>
				</select>
			</div>
		</WorkspaceToolbar>
		<ScrollableRegion label="Payroll run results" className="surface table payroll-table">
			<div className="table-head"><span>Pay period</span><span>Policy</span><span>Gross</span><span>Net pay</span><span>Status</span><span/></div>
			{filteredRuns.length ? (
				filteredRuns.map((r)=><Link className="table-row" key={r.id} to={`/admin/payroll/${r.id}`}><span><strong>{date(r.periodStart,{month:"long",year:"numeric"})}</strong><small>Pay date · {date(r.payDate)}</small></span><span><strong>{r.policyName}</strong><small>Verified 26 Aug 2026</small></span><span>{r.status==="finalised"?money(r.grossTotalSen):"Calculated on review"}</span><span><strong>{r.status==="finalised"?money(r.netTotalSen):"—"}</strong></span><Status value={r.status}/><ChevronRight/></Link>)
			) : (
				<Empty title="No payroll runs found" body="Try changing your search or status filter." />
			)}
		</ScrollableRegion>
	</TaskWorkspace>;
}

function PayrollDetail({run,employees,attendance,adjustments,corrections,payslips}:{run?:Payroll;employees:Employee[];attendance:Attendance[];adjustments:PayrollAdjustment[];corrections:CorrectionRequest[];payslips:Payslip[]}) {
	const [params, setParams] = useSearchParams();
	const [confirmFinalise, setConfirmFinalise] = useState(false);
	const finaliseButtonRef = useRef<HTMLButtonElement>(null);
	if(!run) return <Empty title="Payroll not found" body="This run is not available."/>;
	const missing = attendance.filter((r)=>r.status==="missing_clock_out"&&r.workDate>=run.periodStart&&r.workDate<=run.periodEnd);
 const pendingCorrections=corrections.filter(c=>c.status==="pending"&&c.workDate>=run.periodStart&&c.workDate<=run.periodEnd);
 const attendanceTotals=aggregateAttendance(attendance,run.periodStart,run.periodEnd);
	const runAdjustments = adjustments.filter((a)=>a.payrollRunId === run.id);
	const storedResults = payslips.filter((p)=>p.payrollRunId === run.id);
	const hasBlockers = missing.length>0||pendingCorrections.length>0;
	const selectedEmployeeId = params.get("employee");
	const selectEmployee = (employeeId:string) => {
		const next = new URLSearchParams(params);
		next.set("employee",employeeId);
		setParams(next,{preventScrollReset:true});
	};
	const clearEmployee = () => {
		const next = new URLSearchParams(params);
		next.delete("employee");
		setParams(next,{preventScrollReset:true});
	};

	const currentTab = params.get("tab") === "adjustments" ? "adjustments" : "employees";
	const setTab = (t: string) => {
		const next = new URLSearchParams(params);
		if (t === "employees") {
			next.delete("tab");
		} else {
			next.set("tab", t);
		}
		setParams(next, { preventScrollReset: true });
	};

	return <TaskWorkspace label={`${date(run.periodStart,{month:"long",year:"numeric"})} payroll review`}>
		<WorkspaceHeader
			eyebrow={<p className="eyebrow"><Link to="/admin/payroll">Payroll</Link> / Run</p>}
			title={`${date(run.periodStart,{month:"long",year:"numeric"})} payroll`}
			description={`Pay date ${date(run.payDate)} · ${run.policyName}`}
			action={
				<>
					<Link className="button secondary" to="/admin/payroll">
						<ChevronLeft size={16}/>All payroll runs
					</Link>
					{run.status==="finalised" ? (
						<>
							<a className="button secondary" href={`/resources/payroll/${run.id}.csv`}><Download size={15}/>CSV</a>
							<a className="button secondary" href={`/resources/payroll/${run.id}.bank.csv`}><Landmark size={15}/>Bank CSV</a>
							<a className="button primary" href={`/resources/payroll/${run.id}.pdf`}><FileText size={15}/>PDF report</a>
						</>
					) : (
						<button
							ref={finaliseButtonRef}
							type="button"
							className="button primary"
							disabled={hasBlockers}
							onClick={() => setConfirmFinalise(true)}
						>
							<ShieldCheck size={16} />
							Finalise payroll
						</button>
					)}
				</>
			}
		/>
		
		<div className="metric-strip" style={{ marginBottom: "16px" }}>
			<article>
				<span>Headcount</span>
				<strong>{employees.length}</strong>
				<small>{run.status === "finalised" ? "Employees paid" : "Eligible employees"}</small>
			</article>
			<article>
				<span>{run.status === "finalised" ? "Total Gross" : "Readiness"}</span>
				<strong style={{ fontSize: run.status === "finalised" ? undefined : "1.2rem" }}>
					{run.status === "finalised" ? money(run.grossTotalSen) : (hasBlockers ? "Blocked" : "Ready")}
				</strong>
				<small>{run.status === "finalised" ? "Taxable earnings" : (hasBlockers ? `${missing.length + pendingCorrections.length} items to resolve` : "All inputs clear")}</small>
			</article>
			<article>
				<span>{run.status === "finalised" ? "Total Net Pay" : "Ad-hoc Adjustments"}</span>
				<strong>
					{run.status === "finalised" ? money(run.netTotalSen) : `${runAdjustments.length}`}
				</strong>
				<small>{run.status === "finalised" ? "Bank disbursement" : "Bonuses & deductions"}</small>
			</article>
		</div>

		{run.status==="draft"&&missing.length>0&&<div className="alert warning"><Clock3/><div><strong>{missing.length} attendance exception{missing.length===1?"":"s"} block finalisation</strong><p>{missing.map((r)=>r.fullName).join(", ")} need a clock-out.</p></div><Link className="button secondary" to="/admin/attendance">Resolve now</Link></div>}

		{run.status==="draft"&&pendingCorrections.length>0&&<div className="alert warning"><Clock3/><div><strong>{pendingCorrections.length} pending attendance corrections block finalisation</strong><p>Approve or reject the requests before freezing payroll.</p></div><Link className="button secondary" to="/admin/attendance/corrections">Review corrections</Link></div>}

		<nav className="tabs" aria-label="Payroll view" style={{ marginBottom: "16px" }}>
			<button
				type="button"
				className={currentTab === "employees" ? "active" : ""}
				onClick={() => setTab("employees")}
			>
				Employees <b>{employees.length}</b>
			</button>
			<button
				type="button"
				className={currentTab === "adjustments" ? "active" : ""}
				onClick={() => setTab("adjustments")}
			>
				Ad-hoc adjustments <b>{runAdjustments.length}</b>
			</button>
		</nav>

		{currentTab === "employees" ? (
			<PayrollEmployeeReview employees={employees} attendance={attendanceTotals} adjustments={runAdjustments} storedResults={storedResults} runStatus={run.status === "finalised" ? "finalised" : "draft"} policyName={run.policyName} blocked={hasBlockers} payrollRunId={run.id} selectedEmployeeId={selectedEmployeeId} onSelectEmployee={selectEmployee} onClearSelection={clearEmployee}/>
		) : (
			<section className="surface adjustment-panel" aria-label="Ad-hoc adjustments ledger">
				<div className="section-head">
					<div>
						<p className="eyebrow">Adjustments ledger</p>
						<h2>All ad-hoc allowances & deductions</h2>
						<p className="muted" style={{ margin: "4px 0 0", fontSize: ".76rem" }}>
							{run.status === "draft"
								? "Add or remove ad-hoc bonuses, allowances, and deductions before finalising payroll."
								: "Immutable adjustment records finalized with this payroll run."}
						</p>
					</div>
				</div>
				{runAdjustments.length > 0 ? (
					<div className="adjustment-list">
						{runAdjustments.map((a)=>{
							const isDeduction = a.type === "deduction";
							return (
								<div className="adjustment-row" key={a.id}>
									<span><strong>{a.fullName}</strong><small>{a.description}</small></span>
									<span>
										<span className={`adj-type-pill ${a.type}`}>
											{a.type === "deduction" ? "Deduction" : a.type === "bonus" ? "Bonus" : a.type === "pcb" ? "PCB" : "Allowance"}
										</span>
									</span>
									<span className={`adj-card-amount ${isDeduction ? "negative" : "positive"}`}>
										{isDeduction ? "-" : "+"}{money(a.amountSen)}
									</span>
									{run.status === "draft" && (
										<Form method="post" style={{margin:0}}>
											<input type="hidden" name="intent" value="delete-adjustment"/>
											<input type="hidden" name="id" value={a.id}/>
											<button className="adj-delete-btn" aria-label="Delete adjustment" title="Remove adjustment">
												<Trash2 size={15}/>
											</button>
										</Form>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<p className="muted" style={{fontSize:".8rem",margin:"16px 0"}}>No ad-hoc adjustments added to this run yet. You can add them below or directly inside an employee's inspector card.</p>
				)}

				{run.status === "draft" && (
					<details style={{marginTop:"20px"}} className="employee-form">
						<summary>Add an adjustment to this run <ChevronRight size={16}/></summary>
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
							<PendingButton intent="add-adjustment" pendingLabel="Adding adjustment…">
								Add to draft run
							</PendingButton>
						</Form>
					</details>
				)}
			</section>
		)}

		{run.status === "finalised" && (
			<div className="finalised-banner" style={{ marginTop: "16px" }}>
				<Check/>
				<div>
					<strong>Payroll finalised {date(run.finalisedAt)}</strong>
					<span>Net pay {money(run.netTotalSen)} · stored calculation results retained for audit</span>
				</div>
			</div>
		)}

		{run.status==="draft"&&confirmFinalise&&<div className="confirmation-overlay" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget){setConfirmFinalise(false);requestAnimationFrame(()=>finaliseButtonRef.current?.focus());}}}><section className="surface confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="finalise-title"><p className="eyebrow">Final confirmation</p><h2 id="finalise-title">Finalise {date(run.periodStart,{month:"long",year:"numeric"})} payroll?</h2><p>This freezes the stored payroll results and publishes payslips to employees. The run cannot be recalculated after finalisation.</p><div><button type="button" className="button secondary" onClick={()=>{setConfirmFinalise(false);requestAnimationFrame(()=>finaliseButtonRef.current?.focus());}}>Cancel</button><Form method="post"><input type="hidden" name="intent" value="finalise-payroll"/><input type="hidden" name="id" value={run.id}/><PendingButton intent="finalise-payroll" pendingLabel="Finalising payroll…">Confirm finalisation</PendingButton></Form></div></section></div>}
	</TaskWorkspace>;
}

function Policy({policies}:{policies:PolicyRecord[]}){
	const [showCreate, setShowCreate] = useState(false);
	const createButtonRef = useRef<HTMLButtonElement>(null);
	const closeCreate = () => {
		setShowCreate(false);
		requestAnimationFrame(() => createButtonRef.current?.focus());
	};
	return <>
		<PageHeader
			eyebrow={<p className="eyebrow"><Link to="/admin/payroll">Payroll</Link> / Policies</p>}
			title="Statutory Policies"
			description="Statutory contribution schedules for Malaysian employees under 60."
			action={
				<>
					<Link className="button secondary" to="/admin/payroll">
						<ChevronLeft size={16}/>Back to payroll
					</Link>
					<button ref={createButtonRef} className="button primary" onClick={()=>setShowCreate(true)}>
						<Plus size={16}/>Clone custom policy
					</button>
				</>
			}
		/>
		{showCreate?<section id="create-policy" className="surface employee-form policy-create" style={{marginBottom:"20px"}} aria-labelledby="create-policy-title">
			<div className="policy-create-head"><div><p className="eyebrow">New policy</p><h2 id="create-policy-title">Create from the current policy</h2></div><button type="button" className="button secondary" onClick={closeCreate}>Cancel</button></div>
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
				<PendingButton intent="clone-policy" pendingLabel="Saving policy…">Save custom policy</PendingButton>
			</Form>
		</section>:null}

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
	return <TaskWorkspace label="Payroll exports">
		<WorkspaceHeader eyebrow="Reports" title="Payroll exports" description="Download files generated from finalised payroll records."/>
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
	</TaskWorkspace>;
}

function Notifications({items}:{items:Notification[]}){
	const hasUnread = items.some((i)=>!i.readAt);
	return <>
		<PageHeader eyebrow="Inbox" title="Notifications" description="Every alert links back to the work that created it." action={hasUnread ? <Form method="post" style={{margin:0}}><input type="hidden" name="intent" value="read-all-notifications"/><button className="button secondary"><Check size={16}/>Mark all as read</button></Form> : undefined}/>
		<section className="surface notification-list">
			{items.length ? items.map((item)=>(
				<article key={item.id} className={item.readAt ? "" : "unread"}>
					<span className="notification-dot"/>
					<div>
						<strong>{item.title}</strong>
						<p>{item.body}</p>
						<small>{date(item.createdAt,{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</small>
					</div>
					<div>
						{item.href&&<Link className="text-button" to={item.href}>Open <ChevronRight/></Link>}
						{!item.readAt&&<Form method="post"><input type="hidden" name="intent" value="read-notification"/><input type="hidden" name="id" value={item.id}/><button className="text-button">Mark read</button></Form>}
					</div>
				</article>
			)) : (
				<Empty title="All caught up" body="New payroll, leave and attendance updates will appear here."/>
			)}
		</section>
	</>;
}

function EmployeeRouter({path,data}:{path:string;data:Awaited<ReturnType<typeof loader>>}){const employee=data.employees[0];if(path==="/employee/attendance")return <EmployeeAttendance records={data.attendance} employee={employee} today={data.today} corrections={data.corrections}/>;if(path==="/employee/leave")return <EmployeeLeaveWorkspace employeeId={employee.id} ownRecords={data.leave} sharedRecords={data.sharedLeave} balances={data.balances} holidays={data.holidays} today={data.today} backdateDays={data.companyInfo.leaveBackdateDays}/>;if(path.includes("/employee/payslips/"))return <PayslipDetail slip={data.payslips.find((p)=>path.endsWith(p.id))}/>;if(path==="/employee/payslips")return <Payslips slips={data.payslips}/>;if(path==="/employee/notifications")return <Notifications items={data.notifications}/>;if(path==="/employee/profile")return <EmployeeProfile employee={employee}/>;return <EmployeeHome data={data} employee={employee}/>}

function EmployeeHome({data,employee}:{data:Awaited<ReturnType<typeof loader>>;employee:Employee}){
	const todayRecords=data.attendance.filter((r)=>r.workDate===data.today);
	const activeShift=todayRecords.find((r)=>!r.clockOut);
	const totalMins=todayRecords.reduce((sum,r)=>sum+(r.workedMinutes??0),0);
	const annual=data.balances.find((b)=>b.leaveTypeId==="leave-annual");
	const annualAvailable=annual?calculateProjectedBalance(annual).availableHalfDays/2:0;
	return <><div className="employee-hello"><div><p>{date(data.today,{weekday:"long",day:"numeric",month:"long"})}</p><h1>Good morning, {employee.fullName.split(" ")[0]}</h1></div><div className="avatar large">{initials(employee.fullName)}</div></div><section className="employee-hero"><div><p className="eyebrow light">Today’s attendance</p><h2>{activeShift?"You’re clocked in":todayRecords.length>0?`${(totalMins/60).toFixed(1)}h worked today`:"Ready when you are"}</h2><p>{activeShift?`Since ${time(activeShift.clockIn)} · ${activeShift.clockInMethod === "qr" ? "QR" : "Fingerprint"} scan`:todayRecords.length>0?`Completed ${todayRecords.length} shift session${todayRecords.length===1?"":"s"} today`:"Start your workday with a secure scan."}</p></div><Link className="button paper" to="/employee/attendance">View activity <ChevronRight/></Link><span className="hero-orbit"><Clock3/></span></section><div className="employee-stats"><Link to="/employee/leave"><span><CalendarDays/></span><div><small>Annual leave</small><strong>{annualAvailable} days</strong></div><ChevronRight/></Link><Link to="/employee/payslips"><span><WalletCards/></span><div><small>Latest net pay</small><strong>{money(data.payslips[0]?.netPaySen)}</strong></div><ChevronRight/></Link></div><section className="employee-section"><div className="section-head"><div><p className="eyebrow">For you</p><h2>Recent updates</h2></div><Link to="/employee/notifications">View all</Link></div>{data.notifications.slice(0,3).map((n)=><Link className="update-row" to={n.href??"/employee/notifications"} key={n.id}><span className="action-icon emerald"><Bell/></span><span><strong>{n.title}</strong><small>{n.body}</small></span><ChevronRight/></Link>)}</section></>}

function Payslips({slips}:{slips:Payslip[]}){return <><PageHeader eyebrow="Self-service" title="Payslips" description="Your protected, finalised payroll records."/><section className="payslip-list">{slips.length?slips.map((s)=><Link className="surface payslip-row" to={`/employee/payslips/${s.id}`} key={s.id}><div className="document-icon"><FileText/></div><span><strong>{date(`${s.period}-01`,{month:"long",year:"numeric"})}</strong><small>Paid {date(s.payDate)}</small></span><span><small>Net pay</small><strong>{money(s.netPaySen)}</strong></span><Status value="finalised"/><ChevronRight/></Link>):<Empty title="No payslips yet" body="Finalised payroll records will appear here."/>}</section></>}

function PayslipDetail({slip}:{slip?:Payslip}){if(!slip)return <Empty title="Payslip not found" body="You do not have access to this record."/>;const b=JSON.parse(slip.breakdownJson) as PayrollBreakdown;return <><PageHeader eyebrow="Payslips / Detail" title={`${date(`${slip.period}-01`,{month:"long",year:"numeric"})} payslip`} description={`Merdeka Coffee · paid ${date(slip.payDate)}`} action={<><Link className="button secondary" to="/employee/payslips"><ChevronRight className="back-icon"/>Back to payslips</Link><a className="button primary" href={`/resources/payslips/${slip.id}.pdf`}><Download/>Download PDF</a></>}/><section className="payslip-paper"><div className="payslip-brand"><div className="wordmark"><span>P</span> PayME</div><div><strong>Merdeka Coffee Sdn. Bhd.</strong><small>Document issuer · 202001028884</small></div></div><div className="net-block"><span>Net pay</span><strong>{money(slip.netPaySen)}</strong><small>Finalised payroll record</small></div><div className="payslip-columns"><section><h2>Earnings</h2><dl><div><dt>Base pay</dt><dd>{money(b.basePaySen)}</dd></div><div><dt>Overtime</dt><dd>{money(b.overtimePaySen)}</dd></div><div><dt>Allowances</dt><dd>{money(b.allowanceSen)}</dd></div><div className="total"><dt>Gross pay</dt><dd>{money(slip.grossPaySen)}</dd></div></dl></section><section><h2>Deductions</h2><dl><div><dt>EPF</dt><dd>{money(b.epfEmployeeSen)}</dd></div><div><dt>SOCSO</dt><dd>{money(b.socsoEmployeeSen)}</dd></div><div><dt>EIS</dt><dd>{money(b.eisEmployeeSen)}</dd></div><div><dt>PCB</dt><dd>{money(b.pcbSen)}</dd></div><div className="total"><dt>Total deductions</dt><dd>{money(slip.totalDeductionsSen)}</dd></div></dl></section></div><p className="payslip-note">Generated from the finalised payroll record. PCB values reflect verified tax schedules.</p></section></>}

function EmployeeProfile({employee}:{employee:Employee}){
	const actionResult = useActionData<typeof action>();
	const [showEdit, setShowEdit] = useState(false);
	const [email, setEmail] = useState(employee.email);
	const [phone, setPhone] = useState(employee.phone);
	const [bankAccountNumber, setBankAccountNumber] = useState(employee.bankAccountNumber ?? "");
	const editButtonRef = useRef<HTMLButtonElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);
	const dirty = email !== employee.email || phone !== employee.phone || bankAccountNumber !== (employee.bankAccountNumber ?? "");
	useEffect(()=>{
		if(showEdit) emailRef.current?.focus();
	},[showEdit]);
	useEffect(()=>{
		if(!dirty) return;
		const warn=(event:BeforeUnloadEvent)=>event.preventDefault();
		window.addEventListener("beforeunload",warn);
		return()=>window.removeEventListener("beforeunload",warn);
	},[dirty]);
	const closeEdit=()=>{
		setEmail(employee.email);setPhone(employee.phone);setBankAccountNumber(employee.bankAccountNumber ?? "");setShowEdit(false);
		requestAnimationFrame(()=>editButtonRef.current?.focus());
	};
	useEffect(()=>{
		if(showEdit && actionResult && "ok" in actionResult && actionResult.ok === "Profile information updated successfully.") closeEdit();
	},[actionResult]);
	return <>
		<PageHeader eyebrow="Self-service" title="Profile" description="Your personal and employment details." action={!showEdit?<button ref={editButtonRef} className="button primary" onClick={()=>setShowEdit(true)}><Plus/>Edit contact</button>:undefined}/>
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

		{showEdit&&<section id="edit-contact" className="surface employee-form profile-edit" style={{marginTop:"20px"}} aria-labelledby="edit-contact-title">
			<div className="section-head"><div><p className="eyebrow">Profile details</p><h2 id="edit-contact-title">Update contact & bank details</h2></div><button type="button" className="text-button" onClick={closeEdit}>Cancel</button></div>
			<Form method="post" className="form-stack" style={{marginTop:"12px"}}>
				<input type="hidden" name="intent" value="update-self-profile"/>
				<div className="form-pair">
					<label>Email address
						<input ref={emailRef} name="email" type="email" value={email} onChange={(event)=>setEmail(event.target.value)} required/>
					</label>
					<label>Phone number
						<input name="phone" value={phone} onChange={(event)=>setPhone(event.target.value)} required/>
					</label>
				</div>
				<div className="form-pair">
					<label>Disbursement Bank Account No.
						<input name="bankAccountNumber" value={bankAccountNumber} onChange={(event)=>setBankAccountNumber(event.target.value)} placeholder="e.g. 514012384910"/>
					</label>
					<div/>
				</div>
				<button className="button primary">Save profile updates</button>
			</Form>
		</section>}
	</>;
}
