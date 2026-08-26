import { cloudflareContext } from "../context";
import { requireUser } from "../services/auth.server";
import { payrollReportPdf } from "../services/pdf.server";
import type { Route } from "./+types/payroll-pdf";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.get(cloudflareContext).env;
	await requireUser(request, env, "admin");
	const run = await env.DB.prepare("SELECT period FROM payroll_runs WHERE id=? AND status='finalised'").bind(params.id).first<{ period: string }>();
	if (!run) throw new Response("Finalised payroll not found", { status: 404 });
	const rows = (await env.DB.prepare(`SELECT e.employee_code employeeCode,e.full_name fullName,pr.gross_pay_sen grossPaySen,pr.total_deductions_sen totalDeductionsSen,pr.net_pay_sen netPaySen,pr.employer_contributions_sen employerContributionsSen FROM payroll_results pr JOIN employees e ON e.id=pr.employee_id WHERE pr.payroll_run_id=? ORDER BY e.employee_code`).bind(params.id).all<{ employeeCode: string; fullName: string; grossPaySen: number; totalDeductionsSen: number; netPaySen: number; employerContributionsSen: number }>() ).results;
	const bytes = await payrollReportPdf(run.period, rows);
	return new Response(bytes.buffer as ArrayBuffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="payroll-${run.period}.pdf"`, "Cache-Control": "private, no-store" } });
}
