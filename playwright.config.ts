import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	globalSetup: "./tests/e2e/global-setup.ts",
	fullyParallel: false,
	workers: 1,
	expect: { timeout: 15_000 },
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
		{ name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
		{ name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
		{ name: "small-mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } } },
	],
	webServer: { command: "npm run dev -- --host 127.0.0.1 --force", url: "http://127.0.0.1:5173/login", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
