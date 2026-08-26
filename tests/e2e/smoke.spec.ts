import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("admin can sign in and reach live people and payroll data", async ({ page }) => {
	await page.goto("/login");
	await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
	await page.getByRole("button", { name: /Admin/ }).click();
	await page.getByRole("button", { name: "Enter workspace" }).click();
	await expect(page.getByRole("heading", { name: /Good morning/ })).toBeVisible();
	await page.goto("/admin/employees");
	await expect(page.getByText("Farah Iskandar")).toBeVisible();
	const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
	expect(results.violations).toEqual([]);
});

test("employee account only sees Farah self-service", async ({ page }) => {
	await page.goto("/login");
	await page.getByRole("button", { name: /Employee/ }).click();
	await page.getByRole("button", { name: "Enter workspace" }).click();
	await expect(page.getByRole("heading", { name: "Good morning, Farah" })).toBeVisible();
	await page.goto("/admin");
	await expect(page).toHaveURL(/\/employee$/);
	await page.goto("/employee/payslips/not-owned");
	await expect(page.getByText("You do not have access to this record.")).toBeVisible();
});
