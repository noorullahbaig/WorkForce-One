// fontkit's Indic shaping state machine requires this runtime in Workers and Node.
import "regenerator-runtime/runtime.js";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { money } from "../lib/format";
import { payslipLineItems } from "./payslip-line-items";
import type { PdfFontBytes } from "./pdf-fonts.server";

export type PayrollPdfRow = { fullName: string; employeeCode: string; grossPaySen: number; totalDeductionsSen: number; netPaySen: number; employerContributionsSen: number };
type Fonts = { regular: PDFFont; bold: PDFFont; runs: (text: string) => { text: string; font: PDFFont }[] };
const muted = rgb(.4, .45, .43);
async function document(fontBytes: PdfFontBytes, content: string) {
 const pdf = await PDFDocument.create();
 pdf.registerFontkit(fontkit);
 const [regular, chinese, tamil, bold] = await Promise.all([
  pdf.embedFont(fontBytes.latin, {subset:true}), /[\p{Script=Han}]/u.test(content) ? pdf.embedFont(fontBytes.chinese,{subset:true}) : undefined, /[\p{Script=Tamil}]/u.test(content) ? pdf.embedFont(fontBytes.tamil,{subset:true}) : undefined, pdf.embedFont(StandardFonts.HelveticaBold),
 ]);
 const latinCharacters = new Set(regular.getCharacterSet());
 const tamilCharacters = new Set(tamil?.getCharacterSet() ?? []);
 const runs: Fonts["runs"] = text => {
  const result: ReturnType<Fonts["runs"]> = [];
  for(const character of text) {
   const code = character.codePointAt(0)!;
   const font = latinCharacters.has(code) ? regular : tamilCharacters.has(code) && tamil ? tamil : chinese ?? regular;
   const last = result.at(-1);
   if(last?.font === font) last.text += character;
   else result.push({text:character,font});
  }
  return result;
 };
 return {pdf, fonts:{regular,bold,runs}};
}
function width(text:string, size:number, fonts:Fonts) { return fonts.runs(text).reduce((sum,run)=>sum+run.font.widthOfTextAtSize(run.text,size),0); }
function draw(page:PDFPage,text:string,x:number,y:number,size:number,fonts:Fonts) {
 for(const run of fonts.runs(text)) { page.drawText(run.text,{x,y,size,font:run.font}); x+=run.font.widthOfTextAtSize(run.text,size); }
}
/** Wrap at word boundaries where possible, and at grapheme boundaries for long names. */
function wrap(text:string,maxWidth:number,size:number,fonts:Fonts) {
 const lines:string[]=[];
 let current="";
 const segments = new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(text.replace(/[\r\n]+/g," "));
 for(const {segment} of segments) {
  if(current && width(current+segment,size,fonts)>maxWidth) {
   const space=current.lastIndexOf(" ");
   if(space>0) { lines.push(current.slice(0,space)); current=current.slice(space+1)+segment; }
   else { lines.push(current); current=segment; }
  } else current+=segment;
 }
 if(current || !lines.length) lines.push(current);
 return lines;
}
function header(page:PDFPage,fonts:Fonts,title:string,subtitle:string) {
 page.drawRectangle({x:0,y:760,width:595,height:82,color:rgb(.043,.122,.165)});
 page.drawText("PayME",{x:42,y:806,size:9,font:fonts.bold,color:rgb(.47,.84,.71)});
 page.drawText(title,{x:42,y:782,size:20,font:fonts.bold,color:rgb(1,1,1)});
 page.drawText(subtitle,{x:42,y:765,size:8,font:fonts.regular,color:rgb(.7,.78,.78)});
}
function footers(pdf:PDFDocument,fonts:Fonts,label:string) {
 const pages=pdf.getPages();
 pages.forEach((page,index)=>{
  page.drawText(label,{x:42,y:35,size:7,font:fonts.regular,color:muted});
  page.drawText(`Page ${index+1} of ${pages.length}`,{x:495,y:35,size:7,font:fonts.regular,color:muted});
 });
}
function amount(page:PDFPage,value:number,x:number,y:number,maxWidth:number,fonts:Fonts,total=false) {
 const text=money(value), font=total?fonts.bold:fonts.regular;
 const size=Math.min(8,maxWidth/font.widthOfTextAtSize(text,1));
 page.drawText(text,{x,y,size,font});
}
export async function payrollReportPdf(period:string,rows:PayrollPdfRow[],fontBytes:PdfFontBytes) {
 const {pdf,fonts}=await document(fontBytes, rows.map(row=>`${row.fullName} ${row.employeeCode}`).join(" "));
 const columns=[42,240,335,420,505];
 const newPage=()=>{
  const page=pdf.addPage([595,842]);
  header(page,fonts,`Payroll report · ${period}`,"Merdeka Coffee Sdn. Bhd. · Generated from finalised payroll records");
  ["Employee","Gross","Deductions","Net pay","Employer"].forEach((text,index)=>page.drawText(text,{x:columns[index],y:730,size:8,font:fonts.bold,color:muted}));
  return page;
 };
 let page=newPage(), y=705;
 for(const row of rows) {
  const lines=wrap(`${row.fullName} · ${row.employeeCode}`,184,8,fonts);
  const height=Math.max(29,lines.length*12+12);
  if(y-height+12<72) { page=newPage(); y=705; }
  // Extremely long names continue onto following pages without dropping text.
  for(let index=0;index<lines.length;index++) {
   if(y-index*12<84) {
    page=newPage(); y=705+index*12;
   }
   draw(page,lines[index],42,y-index*12,8,fonts);
   if(index===0) [row.grossPaySen,row.totalDeductionsSen,row.netPaySen,row.employerContributionsSen].forEach((value,col)=>amount(page,value,columns[col+1],y,[85,75,75,48][col],fonts,col===2));
  }
  y-=height;
  page.drawLine({start:{x:42,y:y+19},end:{x:553,y:y+19},thickness:.5,color:rgb(.86,.88,.86)});
 }
 if(y<62) {page=newPage();y=705;}
 const totals=rows.reduce((sum,row)=>[sum[0]+row.grossPaySen,sum[1]+row.totalDeductionsSen,sum[2]+row.netPaySen,sum[3]+row.employerContributionsSen],[0,0,0,0]);
 page.drawText("TOTAL",{x:42,y:y-5,size:9,font:fonts.bold});
 totals.forEach((value,index)=>amount(page,value,columns[index+1],y-5,[85,75,75,48][index],fonts,true));
 footers(pdf,fonts,"Confidential payroll record · Merdeka Coffee Sdn. Bhd.");
 return pdf.save();
}
export async function payslipPdf(row:{fullName:string;employeeCode:string;icNumber?:string;epfNumber?:string;bankName?:string;bankAccountNumber?:string;period:string;payDate:string;grossPaySen:number;totalDeductionsSen:number;netPaySen:number;breakdownJson:string},fontBytes:PdfFontBytes) {
 const {pdf,fonts}=await document(fontBytes, `${row.fullName} ${row.employeeCode} ${row.bankName ?? ""}`);
 const newPage=()=>{const page=pdf.addPage([595,842]);header(page,fonts,`Payslip · ${row.period}`,"Merdeka Coffee Sdn. Bhd. · 202001028884");return page;};
 let page=newPage(), y=722;
 const textBlock=(text:string,size:number,lineHeight:number)=>{
  for(const line of wrap(text,511,size,fonts)) {
   if(y<80) {page=newPage(); y=722;}
   draw(page,line,42,y,size,fonts); y-=lineHeight;
  }
 };
 textBlock(row.fullName,15,21);
 textBlock(`${row.employeeCode} · Pay date ${row.payDate}`,8.5,15);
 textBlock(`MyKad: ${row.icNumber || "—"}  ·  EPF: ${row.epfNumber || "—"}  ·  ${row.bankName || "Maybank"}: ${row.bankAccountNumber || "—"}`,8,14);
 if(y<400) {page=newPage();y=722;}
 y-=10;
 page.drawRectangle({x:42,y:y-65,width:511,height:65,color:rgb(.91,.96,.94)});
 page.drawText("NET PAY",{x:60,y:y-25,size:8,font:fonts.bold,color:rgb(.03,.43,.31)});
 page.drawText(money(row.netPaySen),{x:60,y:y-52,size:24,font:fonts.bold,color:rgb(.04,.12,.16)});
 y-=105;
 const items=payslipLineItems(row);
 for(const [index,group] of [items.earnings,items.deductions].entries()) {
  const x=index===0?42:315;
  page.drawText(index===0?"EARNINGS":"DEDUCTIONS",{x,y,size:8,font:fonts.bold});
  group.forEach((item,i)=>{
   const lineY=y-30-i*28;
   page.drawText(item.label,{x,y:lineY,size:9,font:item.total?fonts.bold:fonts.regular});
   amount(page,item.amountSen,index===0?205:465,lineY,index===0?90:88,fonts,item.total);
  });
 }
 footers(pdf,fonts,"Confidential payslip · Finalised payroll record");
 return pdf.save();
}
