import { chromium, type FullConfig } from "@playwright/test";

export default async function warmClientBundle(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Playwright baseURL is required for the client warm-up.");
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.goto(new URL("/login", baseURL).toString());
      await page.getByRole("button", { name: /Admin/ }).click();
      try {
        await page.waitForFunction(
          () =>
            (document.querySelector('input[name="email"]') as HTMLInputElement)
              ?.value === "admin@workforceone.demo",
          undefined,
          { timeout: 5_000 },
        );
        return;
      } catch {
        if (attempt === 3) {
          throw new Error("The development client did not hydrate after three attempts.");
        }
      }
    }
  } finally {
    await browser.close();
  }
}
