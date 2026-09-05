import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, role: "Admin" | "Employee") {
	await page.request.post("/logout");
	await page.goto("/login");
	await page.getByLabel("Email address").fill(role === "Admin" ? "admin@workforceone.demo" : "employee@workforceone.demo");
	await page.getByLabel("Password").fill(role === "Admin" ? "AdminDemo#2026" : "EmployeeDemo#2026");
	await page.getByRole("button", { name: "Enter workspace" }).click();
	await page.waitForURL(role === "Admin" ? /\/admin$/ : /\/employee$/);
	const skipTour = page.getByRole("button", { name: "Skip tour" });
	if (await skipTour.isVisible()) await skipTour.click();
}

	test("employee plans leave in the shared calendar", async ({ page }) => {
	await signIn(page, "Employee");
	await page.goto("/employee/leave?month=2099-01&date=2099-01-02&request=new");

	await expect(page.getByRole("grid", { name: "January 2099 shared leave calendar" })).toBeVisible();
	await expect(page.getByRole("complementary", { name: "Request leave" })).toBeVisible();

	await page.getByLabel("To", { exact: true }).fill("2099-01-05");
	await expect(page.getByText("2 working days")).toBeVisible();
	await expect(page.getByText("2 non-working days excluded")).toBeVisible();

	const accessibility = await new AxeBuilder({ page }).analyze();
	expect(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(" ")) }))).toEqual([]);
});

test("employee can discover calendar events from a selected date", async ({ page }) => {
	await signIn(page, "Employee");
	await page.goto("/employee/leave?month=2026-08&date=2026-08-25");

	await expect(page.getByRole("complementary", { name: "Selected date details" })).toContainText("Mei Ling Wong");
	await expect(page.getByRole("complementary", { name: "Selected date details" })).toContainText("away");
});

test("calendar date navigation preserves context, scroll position, and focus", async ({ page }) => {
	await signIn(page, "Employee");
	await page.goto("/employee/leave?month=2026-08&date=2026-08-28&request=new");
	await page.evaluate(() => window.scrollTo(0, 700));
	const before = await page.evaluate(() => window.scrollY);

	await page
		.getByRole("gridcell", { name: "Saturday, 29 August" })
		.getByRole("link", { name: "Saturday, 29 August, 0 people away" })
		.click();
	await expect(page).toHaveURL(/date=2026-08-29.*request=new/);
	await expect(page.getByLabel("From")).toHaveValue("2026-08-29");
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(Math.max(0, before - 10));
	await expect(page.locator('[data-calendar-date="2026-08-29"]')).toBeFocused();
});

test("successful leave submission closes the form and preserves the selected date", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "The submission journey mutates the shared demo database.");
	await signIn(page, "Admin");
	await page.request.post("/admin", {
		form: { intent: "reset-demo" },
		headers: { Origin: "http://127.0.0.1:5173" },
	});
	await page.getByRole("button", { name: "Sign out" }).first().click();
	await page.waitForURL(/\/login/);
	await signIn(page, "Employee");
	await page.goto("/employee/leave?month=2026-09&date=2026-09-04&request=new");
	await page.getByLabel("Reason").fill("Personal appointment");
	await page.getByRole("button", { name: "Submit leave request" }).click();

	await expect(page).toHaveURL(/\/employee\/leave\?month=2026-09&date=2026-09-04&notice=leave-submitted/);
	await expect(page.getByRole("status")).toContainText("Leave request sent for approval.");
	await expect(page.getByRole("complementary", { name: "Selected date details" })).toBeVisible();
	await expect(page.getByRole("complementary", { name: "Request leave" })).toHaveCount(0);

	await page.getByRole("button", { name: "Sign out" }).first().click();
	await page.waitForURL(/\/login/);
	await page.getByRole("button", { name: /Admin/ }).click();
	await page.getByRole("button", { name: "Enter workspace" }).click();
	await page.waitForURL(/\/admin$/);
	const skipTour = page.getByRole("button", { name: "Skip tour" });
	if (await skipTour.isVisible()) await skipTour.click();
	await page.request.post("/admin", {
		form: { intent: "reset-demo" },
		headers: { Origin: "http://127.0.0.1:5173" },
	});
});

test("admin can switch between calendar planning and the review queue", async ({ page }, testInfo) => {
	await signIn(page, "Admin");
	await page.goto("/admin/leave?month=2026-08");

	await page.getByRole("button", { name: "Filters" }).click();
	await expect(page.getByRole("combobox", { name: "Department" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Employee" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Events" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Status" })).toBeVisible();

	if (testInfo.project.name !== "desktop") {
		await page.getByRole("link", { name: "Requests" }).click();
	}
	await expect(page.getByRole("heading", { name: "Approval queue" })).toBeVisible();

	const accessibility = await new AxeBuilder({ page }).analyze();
	expect(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(" ")) }))).toEqual([]);
});
