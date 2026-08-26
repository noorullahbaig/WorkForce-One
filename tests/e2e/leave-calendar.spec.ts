import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, role: "Admin" | "Employee") {
	await page.goto("/login");
	await page.getByLabel("Email address").fill(role === "Admin" ? "admin@workforceone.demo" : "employee@workforceone.demo");
	await page.getByLabel("Password").fill(role === "Admin" ? "AdminDemo#2026" : "EmployeeDemo#2026");
	await page.getByRole("button", { name: "Enter workspace" }).click();
	await page.waitForURL(role === "Admin" ? /\/admin$/ : /\/employee$/);
}

test("employee plans leave in the shared calendar", async ({ page }) => {
	await signIn(page, "Employee");
	await page.goto("/employee/leave?month=2026-08&date=2026-08-28&request=new");

	await expect(page.getByRole("grid", { name: "August 2026 shared leave calendar" })).toBeVisible();
	await expect(page.getByText("National Day").first()).toBeVisible();
	await expect(page.getByText("Mei Ling Wong").first()).toBeVisible();
	await expect(page.getByRole("complementary", { name: "Request leave" })).toBeVisible();

	await page.getByLabel("To").fill("2026-09-01");
	await expect(page.getByText("2 working days")).toBeVisible();
	await expect(page.getByText("3 non-working days excluded")).toBeVisible();

	const accessibility = await new AxeBuilder({ page }).analyze();
	expect(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(" ")) }))).toEqual([]);
});

test("admin can switch between calendar planning and the review queue", async ({ page }, testInfo) => {
	await signIn(page, "Admin");
	await page.goto("/admin/leave?month=2026-08");

	await expect(page.getByRole("combobox", { name: "Department" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Employee" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Events" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Status" })).toBeVisible();

	if (testInfo.project.name !== "desktop") {
		await page.getByRole("link", { name: "Requests" }).click();
	}
	await expect(page.getByRole("heading", { name: "Approval queue" })).toBeVisible();
	await expect(page.getByText(/Sales employees already away/)).toBeVisible();

	const accessibility = await new AxeBuilder({ page }).analyze();
	expect(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(" ")) }))).toEqual([]);
});
