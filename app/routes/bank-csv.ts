import { cloudflareContext } from "../context";
import { requireUser } from "../services/auth.server";
import type { Route } from "./+types/bank-csv";

export async function loader({ request, params, context }: Route.LoaderArgs) {
	const env = context.get(cloudflareContext).env;
	await requireUser(request, env, "admin");
	const rows = (await env.DB.prepare(`
		SELECT 
			e.employee_code employeeCode,
			e.full_name fullName,
			COALESCE(e.ic_number, '—') icNumber,
			COALESCE(e.bank_name, 'Maybank') bankName,
			COALESCE(e.bank_account_number, '—') bankAccountNumber,
			pr.net_pay_sen netPaySen,
			r.period
		FROM payroll_results pr 
		JOIN employees e ON e.id=pr.employee_id 
		JOIN payroll_runs r ON r.id=pr.payroll_run_id 
		WHERE r.id=? AND r.status='finalised' 
		ORDER BY e.employee_code
	`).bind(params.id).all<{
		employeeCode: string;
		fullName: string;
		icNumber: string;
		bankName: string;
		bankAccountNumber: string;
		netPaySen: number;
		period: string;
	}>()).results;

	if (!rows.length) throw new Response("Finalised payroll not found", { status: 404 });

	const headers = ["Employee Code", "Employee Name", "MyKad IC", "Bank Name", "Account Number", "Net Pay (RM)", "Payment Reference"];
	const escape = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
	
	const lines = [
		headers.join(","),
		...rows.map((r) => [
			escape(r.employeeCode),
			escape(r.fullName),
			escape(r.icNumber),
			escape(r.bankName),
			escape(r.bankAccountNumber),
			escape((r.netPaySen / 100).toFixed(2)),
			escape(`SALARY ${r.period}`),
		].join(",")),
	];

	return new Response(lines.join("\n"), {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="workforce-one-bank-payout-${params.id}.csv"`,
			"Cache-Control": "private, no-store",
		},
	});
}
