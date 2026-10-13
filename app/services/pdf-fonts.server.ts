export type PdfFontBytes = { latin: Uint8Array; chinese: Uint8Array; tamil: Uint8Array };
export async function loadPdfFonts(assets: { fetch: typeof fetch }, requestUrl: string): Promise<PdfFontBytes> {
 const read = async (path: string) => {
  const response = await assets.fetch(new Request(new URL(`/fonts/${path}`, requestUrl)));
  if (!response.ok) throw new Error(`Bundled PDF font unavailable: ${path}`);
  return new Uint8Array(await response.arrayBuffer());
 };
 const [latin, chinese, tamil] = await Promise.all([read("NotoSans-Regular.ttf"), read("NotoSansSC-Regular.ttf"), read("NotoSansTamil-Regular.ttf")]);
 return { latin, chinese, tamil };
}
