import { expect, test } from "@playwright/test";

async function chooseRole(page: import("@playwright/test").Page, role: "Admin" | "Employee") {
	await page.goto("/login");
	await page.getByRole("button", { name: new RegExp(role) }).click();
	await page.getByRole("button", { name: "Enter workspace" }).click();
}

test("first-login tours are role-specific and can be replayed", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "The mobile journey validates responsive tour placement.");
	await chooseRole(page, "Admin");
	await expect(page.getByRole("dialog")).toContainText("Step 1 of 5");
	await expect(page.getByRole("heading", { name: "Home and action queue" })).toBeVisible();
	await page.getByRole("button", { name: "Next" }).click();
	await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);

	await page.reload();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await page.getByRole("button", { name: "User profile & account" }).click();
	await page.getByRole("button", { name: "Take product tour" }).click();
	await expect(page.getByRole("heading", { name: "Home and action queue" })).toBeVisible();
	await page.getByRole("button", { name: "Skip tour" }).click();

	await page.getByRole("button", { name: "Sign out" }).first().click();
	await chooseRole(page, "Employee");
	await expect(page.getByRole("heading", { name: "Your employee home" })).toBeVisible();
	await expect(page.getByRole("dialog")).toContainText("Step 1 of 5");
});

test("payroll review controls and coach mark fit the mobile viewport", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "mobile", "Responsive layout is covered by the mobile project.");
	await chooseRole(page, "Admin");
	await expect(page.getByRole("dialog")).toBeVisible();
	await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.getByRole("button", { name: "Skip tour" }).click();
	await page.goto("/admin/payroll/payroll-2026-08");
	await expect(page.getByRole("heading", { name: "Employee pay review" })).toBeVisible();
	await expect(page.getByText("Showing 1–10 of 10 employees")).toBeVisible();
	await page.getByLabel("Search employees").fill("MC-1001");
	await expect(page.getByText("Showing 1–1 of 1 employee")).toBeVisible();
	await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
