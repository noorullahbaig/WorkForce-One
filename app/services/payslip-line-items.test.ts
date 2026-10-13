import { expect, it } from "vitest";
import { payslipLineItems } from "./payslip-line-items";
it("itemises every saved earning and deduction and reconciles totals", () => {
 const items=payslipLineItems({grossPaySen:125000,totalDeductionsSen:25000,breakdownJson:JSON.stringify({basePaySen:100000,overtimePaySen:5000,allowanceSen:10000,bonusSen:10000,unpaidLeaveDeductionSen:10000,epfEmployeeSen:10000,socsoEmployeeSen:1000,eisEmployeeSen:500,pcbSen:1000,otherDeductionSen:2500})});
 expect(items.earnings.map(x=>x.label)).toEqual(["Base pay","Overtime","Allowances","Bonus","Gross pay"]);
 expect(items.deductions.map(x=>x.label)).toEqual(["Unpaid leave","EPF","SOCSO","EIS","PCB","Other deductions","Total deductions"]);
 for(const group of [items.earnings,items.deductions]) expect(group.filter(x=>!x.total).reduce((sum,x)=>sum+x.amountSen,0)).toBe(group.at(-1)?.amountSen);
});
it("treats absent optional historical items as zero",()=>{const items=payslipLineItems({grossPaySen:0,totalDeductionsSen:0,breakdownJson:"{}"});expect(items.earnings.every(x=>x.amountSen===0)).toBe(true);expect(items.deductions.every(x=>x.amountSen===0)).toBe(true)});
