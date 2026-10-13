import fontkit from "@pdf-lib/fontkit";
import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { PDFDict, PDFDocument, PDFName, PDFPage, PDFRawStream } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { payrollReportPdf, payslipPdf } from "./pdf.server";
const fonts = () => ({ latin: new Uint8Array(readFileSync("public/fonts/NotoSans-Regular.ttf")), chinese: new Uint8Array(readFileSync("public/fonts/NotoSansSC-Regular.ttf")), tamil: new Uint8Array(readFileSync("public/fonts/NotoSansTamil-Regular.ttf")) });
const row = { fullName: "Audit Employee", employeeCode: "AUDIT-001", grossPaySen: 110000, totalDeductionsSen: 15000, netPaySen: 95000, employerContributionsSen: 10000 };
describe("payroll PDF", () => {
 it.each([0,1,22,23,30,100])("retains %i rows across measured pages", async (count) => {
  const rows = Array.from({ length: count }, (_, index) => ({ ...row, employeeCode: `AUDIT-${index + 1}` }));
  const drawing = vi.spyOn(PDFPage.prototype, "drawText");
  const pdf = await PDFDocument.load(await payrollReportPdf("2027-01", rows, fonts()));
  expect(pdf.getPageCount()).toBe(count <= 22 ? 1 : count <= 30 ? 2 : 5);
  const text = drawing.mock.calls.map(call=>call[0]).join("\n");
  for(const employee of rows) expect(text).toContain(employee.employeeCode);
  expect(drawing.mock.calls.filter(call=>call[0] === "TOTAL")).toHaveLength(1);
  expect(drawing.mock.calls.filter(call=>call[0] === "Employee")).toHaveLength(pdf.getPageCount());
  expect(drawing.mock.calls.filter(call=>call[0].startsWith("Page "))).toHaveLength(pdf.getPageCount());
  for(const [,options] of drawing.mock.calls) expect(options?.y).toBeGreaterThanOrEqual(35);
  drawing.mockRestore();
 });
 it.each(["José Zoë François", "王美玲", "தமிழ்ச்செல்வன்", "Very long employee name ".repeat(12)])("supports and wraps %s", async (fullName) => {
  await expect(payrollReportPdf("2027-01", [{...row, fullName}], fonts())).resolves.toBeInstanceOf(Uint8Array);
  await expect(payslipPdf({...row, fullName, period:"2027-01",payDate:"2027-01-31",breakdownJson:"{}"}, fonts())).resolves.toBeInstanceOf(Uint8Array);
 });
});

it("embeds complete Chinese glyph outlines, not just extractable Unicode text", async()=>{
 const bytes=fonts();
 const pdf=await PDFDocument.load(await payrollReportPdf("2027-01",[{...row,fullName:"王美玲"}],bytes));
 const descriptor=pdf.context.enumerateIndirectObjects().map(([,object])=>object).find(object=>object instanceof PDFDict && object.get(PDFName.of("FontName"))?.toString().includes("NotoSansSC")) as PDFDict;
 expect(descriptor).toBeDefined();
 const stream=pdf.context.lookup(descriptor.get(PDFName.of("FontFile2"))) as PDFRawStream;
 const embedded=fontkit.create(new Uint8Array(inflateSync(stream.getContents())));
 const original=fontkit.create(bytes.chinese);
 for(const [index,character] of [..."王美玲"].entries()) {
  expect(embedded.getGlyph(index+1).path.toSVG()).toBe(original.glyphForCodePoint(character.codePointAt(0)!).path.toSVG());
 }
});
