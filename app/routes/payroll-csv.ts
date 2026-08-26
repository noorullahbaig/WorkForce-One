import { cloudflareContext } from "../context";
import { requireUser } from "../services/auth.server";
import type { Route } from "./+types/payroll-csv";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.get(cloudflareContext).env;
	await requireUser(request, env, "admin");
	const rows = (await env.DB.prepare(`SELECT e.employee_code employeeCode,e.full_name fullName,r.period,pr.gross_pay_sen grossPaySen,pr.total_deductions_sen totalDeductionsSen,pr.net_pay_sen netPaySen,pr.employer_contributions_sen employerContributionsSen FROM payroll_results pr JOIN employees e ON e.id=pr.employee_id JOIN payroll_runs r ON r.id=pr.payroll_run_id WHERE r.id=? AND r.status='finalised' ORDER BY e.employee_code`).bind(params.id).all<Record<string, string | number>>()).results;
	if (!rows.length) throw new Response("Finalised payroll not found", { status: 404 });
	const keys = ["employeeCode", "fullName", "period", "grossPaySen", "totalDeductionsSen", "netPaySen", "employerContributionsSen"];
	const escape = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
	const csv = [keys.join(","), ...rows.map((row: Record<string, string | number>) => keys.map((key) => escape(row[key])).join(","))].join("\n");
	return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="workforce-one-${params.id}.csv"`, "Cache-Control": "private, no-store" } });
}
