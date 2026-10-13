import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { testDatabase } from "../../tests/helpers/database";
import { cloudflareContext } from "../context";
import { createSession } from "../services/auth.server";
import { loader as payrollCsv } from "./payroll-csv";
import { loader as bankCsv } from "./bank-csv";
import { loader as payrollPdf } from "./payroll-pdf";
import { loader as payslipPdf } from "./payslip-pdf";
vi.mock("../services/pdf.server", () => ({
  payrollReportPdf: async (period: string, rows: unknown[]) => new TextEncoder().encode(JSON.stringify({ period, rows })),
  payslipPdf: async (row: unknown) => new TextEncoder().encode(JSON.stringify(row)),
}));
// Rendering has independent tests; download tests exercise real SQL and authentication.
vi.mock("../services/pdf-fonts.server", () => ({ loadPdfFonts: async () => ({ latin: new Uint8Array(), chinese: new Uint8Array(), tamil: new Uint8Array() }) }));
let fixture: Awaited<ReturnType<typeof testDatabase>>, db: D1Database;
const cookies: Record<string,string> = {};
beforeAll(async () => {
  fixture = await testDatabase(); db = fixture.db;
  await db.batch([
    db.prepare("INSERT INTO companies(id,name,registration_number,timezone,created_at,updated_at) SELECT 'company-other','Other','OTHER',timezone,created_at,updated_at FROM companies LIMIT 1"),
    db.prepare("INSERT INTO employees (id,company_id,employee_code,full_name,email,phone,department,position,employment_type,salary_type,monthly_salary_sen,start_date,status,created_at,updated_at) SELECT 'emp-other','company-other','OTHER','Other Employee','other@example.com',phone,department,position,employment_type,salary_type,monthly_salary_sen,start_date,status,created_at,updated_at FROM employees WHERE id='emp-001'"),
    db.prepare("INSERT INTO payroll_runs SELECT 'run-other','company-other',policy_id,period,period_start,period_end,pay_date,status,gross_total_sen,deduction_total_sen,net_total_sen,employer_contribution_total_sen,'other-final',finalised_at,created_at,updated_at FROM payroll_runs WHERE id='payroll-2026-07'"),
    db.prepare("INSERT INTO payroll_results SELECT 'result-other','run-other','emp-other',input_snapshot_json,breakdown_json,gross_pay_sen,total_deductions_sen,net_pay_sen,employer_contributions_sen,created_at FROM payroll_results WHERE id='result-2026-07-001'"),
    db.prepare("INSERT INTO payslips SELECT 'slip-other','result-other','run-other','emp-other',created_at FROM payslips LIMIT 1"),
    db.prepare("INSERT INTO users (id,company_id,employee_id,name,email,role,password_hash,password_salt,active,created_at,updated_at) SELECT 'admin-other','company-other',NULL,'Other Admin','other-admin@example.com','admin',password_hash,password_salt,active,created_at,updated_at FROM users WHERE id='user-admin'"),
  ]);
  for (const id of ['user-admin','user-employee','admin-other']) cookies[id] = (await createSession(id, { DB: db } as Env, false)).split(';')[0];
}, 30000);
afterAll(async () => fixture?.dispose());
const loaders = { payrollCsv, bankCsv, payrollPdf, payslipPdf };
async function download(kind: keyof typeof loaders, id: string, user = 'user-admin') {
  const context = new RouterContextProvider();
  context.set(cloudflareContext, { env: { DB: db } as Env, ctx: {} as ExecutionContext });
  return loaders[kind]({ request: new Request(`https://example.com/download/${id}`, { headers: { Cookie: cookies[user] } }), params: { id }, context } as never);
}
it.each(Object.keys(loaders) as (keyof typeof loaders)[])("%s rejects foreign company IDs for admins", async (kind) => {
  await expect(download(kind, kind === 'payslipPdf' ? 'slip-other' : 'run-other')).rejects.toMatchObject({ status: 404 });
  await expect(download(kind, kind === 'payslipPdf' ? 'payslip-2026-07-001' : 'payroll-2026-07','admin-other')).rejects.toMatchObject({ status: 404 });
});
it.each(Object.keys(loaders) as (keyof typeof loaders)[])("%s serves own company finalised records", async (kind) => {
  expect((await download(kind, kind === 'payslipPdf' ? 'payslip-2026-07-001' : 'payroll-2026-07')).status).toBe(200);
  expect((await download(kind, kind === 'payslipPdf' ? 'slip-other' : 'run-other','admin-other')).status).toBe(200);
});
it.each(['payrollCsv','bankCsv','payrollPdf'] as const)("%s rejects employee report access", async (kind) => {
  await expect(download(kind,'payroll-2026-07','user-employee')).rejects.toMatchObject({ status: 302 });
});
it("employees may download only their own company payslip", async () => {
  expect((await download('payslipPdf','payslip-2026-07-001','user-employee')).status).toBe(200);
  await expect(download('payslipPdf','slip-other','user-employee')).rejects.toMatchObject({ status: 404 });
  await db.prepare("INSERT INTO payroll_results SELECT 'result-colleague','payroll-2026-07','emp-002',input_snapshot_json,breakdown_json,gross_pay_sen,total_deductions_sen,net_pay_sen,employer_contributions_sen,created_at FROM payroll_results WHERE id='result-2026-07-001'").run();
  await db.prepare("INSERT INTO payslips VALUES ('slip-colleague','result-colleague','payroll-2026-07','emp-002','now')").run();
  await expect(download('payslipPdf','slip-colleague','user-employee')).rejects.toMatchObject({ status: 404 });
});
it.each(Object.keys(loaders) as (keyof typeof loaders)[])("%s returns 404 for unknown IDs", async (kind) => {
  await expect(download(kind, 'missing')).rejects.toMatchObject({ status: 404 });
});
it("downloads retain frozen finances while using the current employee profile", async () => {
  await db.prepare("UPDATE employees SET full_name='Current Name',bank_name='Current Bank',bank_account_number='987654',monthly_salary_sen=999999 WHERE id='emp-001'").run();
  const csv = await (await download('bankCsv','payroll-2026-07')).text();
  expect(csv).toContain('Current Name'); expect(csv).toContain('Current Bank'); expect(csv).toContain('987654'); expect(csv).toContain('5771.35');
  const slip = await (await download('payslipPdf','payslip-2026-07-001')).json();
  expect(slip).toMatchObject({ fullName: 'Current Name', bankName: 'Current Bank', bankAccountNumber: '987654', grossPaySen: 670000, netPaySen: 577135 });
});
