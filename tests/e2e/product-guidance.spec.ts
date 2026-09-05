import { expect, test } from "@playwright/test";

async function chooseRole(page: import("@playwright/test").Page, role: "Admin" | "Employee") {
	await page.goto("/login");
	await page.getByRole("button", { name: new RegExp(role) }).click();
	await page.getByRole("button", { name: "Enter workspace" }).click();
}

test("first-login tours are role-specific and can be replayed", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "The mobile journey validates responsive tour placement.");
	await chooseRole(page, "Admin");
	const adminNavigation = page.getByRole("navigation", { name: "Administrator navigation" });
	await expect(adminNavigation.getByRole("link", { name: "Attendance" })).toBeVisible();
	await expect(adminNavigation.getByRole("link", { name: "Leave" })).toBeVisible();
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
	await page.route("**/admin/reports*", async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 450));
		await route.continue();
	});
	await adminNavigation.getByRole("link", { name: "Reports" }).click();
	await expect(page.getByRole("status")).toHaveText("Opening reports…");
	await expect(page).toHaveURL(/\/admin\/reports$/);

	await page.getByRole("button", { name: "Sign out" }).first().click();
	await chooseRole(page, "Employee");
	await expect(page.getByRole("heading", { name: "Your employee home" })).toBeVisible();
	await expect(page.getByRole("dialog")).toContainText("Step 1 of 5");
});

test("administrator task workspaces fit the laptop viewport", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "Laptop viewport assertion runs once.");
	await page.setViewportSize({ width: 1366, height: 768 });
	await chooseRole(page, "Admin");
	const skipTour = page.getByRole("button", { name: "Skip tour" });
	await expect(skipTour).toBeVisible();
	await skipTour.click();

	for (const path of ["/admin/employees", "/admin/attendance", "/admin/payroll", "/admin/reports"]) {
		await page.goto(path);
		await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(768);
	}
});

test("desktop rail and workspace stay aligned while collapsing", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "Desktop rail is hidden at smaller breakpoints.");
	await chooseRole(page, "Admin");
	const skipTour = page.getByRole("button", { name: "Skip tour" });
	await expect(skipTour).toBeVisible();
	await skipTour.click();

	await page.getByRole("button", { name: "Collapse navigation" }).click();
	await page.waitForTimeout(70);
	const transitionGap = await page.evaluate(() => {
		const rail = document.querySelector(".navigation-rail")!.getBoundingClientRect();
		const workspace = document.querySelector(".workspace")!.getBoundingClientRect();
		return Math.abs(rail.right - workspace.left);
	});
	expect(transitionGap).toBeLessThan(1);

	await expect(page.getByRole("button", { name: "Expand navigation" })).toBeVisible();
	await page.reload();
	await expect(page.locator(".navigation-rail")).toHaveClass(/is-collapsed/);
});

test("payroll review controls and coach mark fit the mobile viewport", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "mobile", "Responsive layout is covered by the mobile project.");
	await chooseRole(page, "Admin");
	const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });
	await expect(primaryNavigation.getByRole("link", { name: "Leave" })).toBeVisible();
	await expect(primaryNavigation.getByRole("link", { name: "Payroll" })).toBeVisible();
	await expect(primaryNavigation.getByText("More", { exact: true })).toHaveCount(0);
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
