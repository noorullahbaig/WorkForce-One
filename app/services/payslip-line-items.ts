/** Shared saved payroll amounts for the web view and downloadable payslip. */
export type PayslipLineItem = { label: string; amountSen: number; total?: boolean };
export function payslipLineItems(row: { grossPaySen: number; totalDeductionsSen: number; breakdownJson: string }): { earnings: PayslipLineItem[]; deductions: PayslipLineItem[] } {
 const breakdown = JSON.parse(row.breakdownJson) as Record<string, number>;
 const item = (label: string, key: string): PayslipLineItem => ({ label, amountSen: breakdown[key] ?? 0 });
 return {
  earnings: [item("Base pay", "basePaySen"), item("Overtime", "overtimePaySen"), item("Allowances", "allowanceSen"), item("Bonus", "bonusSen"), {label:"Gross pay", amountSen:row.grossPaySen, total:true}],
  deductions: [item("Unpaid leave", "unpaidLeaveDeductionSen"), item("EPF", "epfEmployeeSen"), item("SOCSO", "socsoEmployeeSen"), item("EIS", "eisEmployeeSen"), item("PCB", "pcbSen"), item("Other deductions", "otherDeductionSen"), {label:"Total deductions", amountSen:row.totalDeductionsSen, total:true}],
 };
}
