import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { money } from "../lib/format";

type PayrollPdfRow = { fullName:string; employeeCode:string; grossPaySen:number; totalDeductionsSen:number; netPaySen:number; employerContributionsSen:number };

function addHeader(page: ReturnType<PDFDocument["addPage"]>, bold: Awaited<ReturnType<PDFDocument["embedFont"]>>, regular: Awaited<ReturnType<PDFDocument["embedFont"]>>, title:string, subtitle:string) {
	page.drawRectangle({x:0,y:760,width:595,height:82,color:rgb(.043,.122,.165)});
	page.drawText("WORKFORCE ONE",{x:42,y:806,size:9,font:bold,color:rgb(.47,.84,.71)});
	page.drawText(title,{x:42,y:782,size:20,font:bold,color:rgb(1,1,1)});
	page.drawText(subtitle,{x:42,y:765,size:8,font:regular,color:rgb(.7,.78,.78)});
}

export async function payrollReportPdf(period:string, rows:PayrollPdfRow[]) {
	const pdf=await PDFDocument.create();const page=pdf.addPage([595,842]);const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
	addHeader(page,bold,regular,`Payroll report · ${period}`,"Merdeka Coffee Sdn. Bhd. · Generated from finalised payroll records");
	const cols=[42,240,335,420,505];["Employee","Gross","Deductions","Net pay","Employer"].forEach((text,index)=>page.drawText(text,{x:cols[index],y:730,size:8,font:bold,color:rgb(.32,.38,.36)}));
	let y=705;for(const row of rows){page.drawText(`${row.fullName} · ${row.employeeCode}`,{x:42,y,size:8,font:regular});page.drawText(money(row.grossPaySen),{x:240,y,size:8,font:regular});page.drawText(money(row.totalDeductionsSen),{x:335,y,size:8,font:regular});page.drawText(money(row.netPaySen),{x:420,y,size:8,font:bold});page.drawText(money(row.employerContributionsSen),{x:505,y,size:8,font:regular});page.drawLine({start:{x:42,y:y-10},end:{x:553,y:y-10},thickness:.5,color:rgb(.86,.88,.86)});y-=29;if(y<80)break}
	const totals=rows.reduce((a,r)=>({gross:a.gross+r.grossPaySen,ded:a.ded+r.totalDeductionsSen,net:a.net+r.netPaySen,employer:a.employer+r.employerContributionsSen}),{gross:0,ded:0,net:0,employer:0});page.drawText("TOTAL",{x:42,y:y-5,size:9,font:bold});[totals.gross,totals.ded,totals.net,totals.employer].forEach((value,index)=>page.drawText(money(value),{x:cols[index+1],y:y-5,size:8,font:bold}));
	page.drawText("Confidential payroll record · Merdeka Coffee Sdn. Bhd.",{x:42,y:35,size:7,font:regular,color:rgb(.4,.45,.43)});return pdf.save();
}

export async function payslipPdf(row:{fullName:string;employeeCode:string;icNumber?:string;epfNumber?:string;bankName?:string;bankAccountNumber?:string;period:string;payDate:string;grossPaySen:number;totalDeductionsSen:number;netPaySen:number;breakdownJson:string}) {
	const pdf=await PDFDocument.create();const page=pdf.addPage([595,842]);const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);const b=JSON.parse(row.breakdownJson) as Record<string,number>;
	addHeader(page,bold,regular,`Payslip · ${row.period}`,"Merdeka Coffee Sdn. Bhd. · 202001028884");
	page.drawText(row.fullName,{x:42,y:722,size:15,font:bold});
	page.drawText(`${row.employeeCode} · Pay date ${row.payDate}`,{x:42,y:706,size:8.5,font:regular,color:rgb(.35,.42,.4)});
	const metaText = `MyKad: ${row.icNumber || "—"}  ·  EPF: ${row.epfNumber || "—"}  ·  ${row.bankName || "Maybank"}: ${row.bankAccountNumber || "—"}`;
	page.drawText(metaText,{x:42,y:690,size:8,font:regular,color:rgb(.4,.45,.43)});
	page.drawRectangle({x:42,y:605,width:511,height:65,color:rgb(.91,.96,.94)});
	page.drawText("NET PAY",{x:60,y:645,size:8,font:bold,color:rgb(.03,.43,.31)});
	page.drawText(money(row.netPaySen),{x:60,y:618,size:24,font:bold,color:rgb(.04,.12,.16)});
	page.drawText("EARNINGS",{x:42,y:565,size:8,font:bold});page.drawText("DEDUCTIONS",{x:315,y:565,size:8,font:bold});const earning=[["Base pay",b.basePaySen],["Overtime",b.overtimePaySen],["Allowances",b.allowanceSen],["Bonus",b.bonusSen],["Gross pay",row.grossPaySen]] as const;const deductions=[["EPF",b.epfEmployeeSen],["SOCSO",b.socsoEmployeeSen],["EIS",b.eisEmployeeSen],["PCB",b.pcbSen],["Total deductions",row.totalDeductionsSen]] as const;earning.forEach(([label,value],i)=>{page.drawText(label,{x:42,y:535-i*28,size:9,font:i===4?bold:regular});page.drawText(money(value),{x:205,y:535-i*28,size:9,font:i===4?bold:regular})});deductions.forEach(([label,value],i)=>{page.drawText(label,{x:315,y:535-i*28,size:9,font:i===4?bold:regular});page.drawText(money(value),{x:465,y:535-i*28,size:9,font:i===4?bold:regular})});page.drawText("Confidential payslip · Finalised payroll record",{x:42,y:35,size:7,font:regular,color:rgb(.4,.45,.43)});return pdf.save();
}
