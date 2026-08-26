import { cloudflareContext } from "../context";
import { requireUser } from "../services/auth.server";
import { payslipPdf } from "../services/pdf.server";
import type { Route } from "./+types/payslip-pdf";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.get(cloudflareContext).env;
	const user = await requireUser(request, env);
	const row = await env.DB.prepare(`SELECT p.employee_id employeeId,e.full_name fullName,e.employee_code employeeCode,r.period,r.pay_date payDate,pr.gross_pay_sen grossPaySen,pr.total_deductions_sen totalDeductionsSen,pr.net_pay_sen netPaySen,pr.breakdown_json breakdownJson FROM payslips p JOIN employees e ON e.id=p.employee_id JOIN payroll_runs r ON r.id=p.payroll_run_id JOIN payroll_results pr ON pr.id=p.payroll_result_id WHERE p.id=?`).bind(params.id).first<{ employeeId: string; fullName: string; employeeCode: string; period: string; payDate: string; grossPaySen: number; totalDeductionsSen: number; netPaySen: number; breakdownJson: string }>();
	if (!row || (user.role === "employee" && row.employeeId !== user.employeeId)) throw new Response("Payslip not found", { status: 404 });
	const bytes = await payslipPdf(row);
	return new Response(bytes.buffer as ArrayBuffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="payslip-${row.period}.pdf"`, "Cache-Control": "private, no-store" } });
}
