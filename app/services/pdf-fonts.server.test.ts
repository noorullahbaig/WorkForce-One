import { expect, it } from "vitest";
import { loadPdfFonts } from "./pdf-fonts.server";
it("loads fonts only through the bundled assets binding", async()=>{
 const urls:string[]=[];
 const fonts=await loadPdfFonts({fetch: (async(input:RequestInfo|URL)=>{urls.push((input as Request).url);return new Response(new Uint8Array([1,2,3]))}) as typeof fetch},"https://payme.example/reports/payroll.pdf");
 expect(urls).toEqual(["https://payme.example/fonts/NotoSans-Regular.ttf","https://payme.example/fonts/NotoSansSC-Regular.ttf","https://payme.example/fonts/NotoSansTamil-Regular.ttf"]);
 expect(fonts.tamil).toEqual(new Uint8Array([1,2,3]));
});
it("rejects unavailable bundled fonts instead of producing broken documents",async()=>{
 await expect(loadPdfFonts({fetch:(async()=>new Response("",{status:404})) as typeof fetch},"https://payme.example")).rejects.toThrow("Bundled PDF font unavailable");
});
