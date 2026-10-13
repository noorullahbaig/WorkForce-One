import type { DemoUser } from "../../services/auth.server";

export type AdjustmentInput = {
  payrollRunId: string;
  employeeId: string;
  type: string;
  amountRm: string;
  description: string;
  reason: string;
};
type AdjustmentResult = { ok: string } | { error: string };

function audit(db: D1Database, user: DemoUser, action: string, id: string, metadata: unknown, now: string) {
  return db.prepare(`INSERT INTO audit_events(id,company_id,actor_user_id,action,entity_type,entity_id,metadata_json,created_at)
    SELECT ?,?,?,?,'payroll_adjustment',?,?,? WHERE changes()=1`)
    .bind(crypto.randomUUID(), user.companyId, user.id, action, id, JSON.stringify(metadata), now);
}

export async function addPayrollAdjustment(
  db: D1Database,
  user: DemoUser,
  input: AdjustmentInput,
  now: string,
): Promise<AdjustmentResult> {
  if (user.role !== "admin") return { error: "Only admins can manage payroll adjustments." };
  if (!["allowance", "bonus", "deduction", "pcb"].includes(input.type))
    return { error: "Choose a supported adjustment type." };
  const description = input.description.trim();
  if (!description) return { error: "Enter an adjustment description." };
  const decimal = input.amountRm.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(decimal))
    return { error: "Enter a positive amount with at most two decimal places." };
  const [whole, fraction = ""] = decimal.split(".");
  // Parse decimal currency without binary floating-point rounding.
  const normalizedWhole = whole.replace(/^0+/, "") || "0";
  if (normalizedWhole.length > 14) return { error: "Adjustment amount is too large." };
  const amountSen = Number(BigInt(normalizedWhole) * 100n + BigInt(fraction.padEnd(2, "0")));
  if (!Number.isSafeInteger(amountSen) || amountSen <= 0)
    return { error: "Enter a positive adjustment amount within the supported range." };
  const id = crypto.randomUUID();
  const results = await db.batch([
    db.prepare(`INSERT INTO payroll_adjustments(id,payroll_run_id,employee_id,type,description,amount_sen,reason,created_at)
      SELECT ?,r.id,e.id,?,?,?,?,? FROM payroll_runs r JOIN employees e ON e.id=? AND e.company_id=r.company_id
      WHERE r.id=? AND r.company_id=? AND r.status='draft'`)
      .bind(id, input.type, description, amountSen, input.reason.trim() || null, now, input.employeeId, input.payrollRunId, user.companyId),
    audit(db, user, "payroll.adjustment_added", id, { payrollRunId: input.payrollRunId, employeeId: input.employeeId, type: input.type, amountSen }, now),
  ]);
  return results[0].meta.changes
    ? { ok: "Payroll adjustment added." }
    : { error: "Draft payroll run or employee not found in your company." };
}

export async function deletePayrollAdjustment(
  db: D1Database,
  user: DemoUser,
  id: string,
  now: string,
): Promise<AdjustmentResult> {
  if (user.role !== "admin") return { error: "Only admins can manage payroll adjustments." };
  const results = await db.batch([
    db.prepare(`DELETE FROM payroll_adjustments WHERE id=? AND EXISTS (
      SELECT 1 FROM payroll_runs r JOIN employees e ON e.id=payroll_adjustments.employee_id AND e.company_id=r.company_id
      WHERE r.id=payroll_adjustments.payroll_run_id AND r.company_id=? AND r.status='draft')`)
      .bind(id, user.companyId),
    audit(db, user, "payroll.adjustment_deleted", id, {}, now),
  ]);
  return results[0].meta.changes
    ? { ok: "Payroll adjustment deleted." }
    : { error: "Draft payroll adjustment not found in your company." };
}
