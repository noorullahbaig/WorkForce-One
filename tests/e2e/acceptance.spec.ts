import { expect, test } from "@playwright/test";

test("complete attendance to payslip acceptance journey", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "The shared mutable acceptance journey runs once.");
	test.setTimeout(90_000);
	await page.goto("/login");
	await page.getByRole("button", { name: "Enter workspace" }).click();

	await page.getByRole("link", { name: "Attendance terminal" }).click();
	await expect(page).toHaveURL(/\/admin\/attendance\/simulate$/);
	await page.locator('select[name="employeeId"]').selectOption("emp-001");
	await page.getByRole("button", { name: "Capture attendance" }).click();
	await expect(page.getByText(/Clock-out captured/)).toBeVisible();
	await page.locator('select[name="employeeId"]').selectOption("emp-010");
	await page.getByRole("button", { name: "Capture attendance" }).click();
	await expect(page.getByText(/Clock-out captured/)).toBeVisible();

	await page.goto("/admin/leave");
	const sarah = page.locator("article.request").filter({ hasText: "Sarah Lim" });
	await sarah.getByRole("button", { name: "Approve" }).click();
	await expect(page.getByText("Leave request approved.")).toBeVisible();

	await page.goto("/admin/payroll/payroll-2026-08");
	await expect(page.getByText(/attendance exception/)).toHaveCount(0);
	await page.getByRole("button", { name: "Finalise payroll" }).click();
	await expect(page.getByText(/Payroll finalised/)).toBeVisible();
	const pdf = await page.request.get("/resources/payroll/payroll-2026-08.pdf");
	expect(pdf.ok()).toBeTruthy();
	expect(pdf.headers()["content-type"]).toContain("application/pdf");
	const csv = await page.request.get("/resources/payroll/payroll-2026-08.csv");
	expect(await csv.text()).toContain("MC-1001");

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/admin");
	await page.getByRole("button", { name: "Open navigation" }).isVisible();
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.reload();
	await page.getByRole("button", { name: "Sign out" }).click();
	await page.getByRole("button", { name: /Employee Farah/ }).click();
	await page.getByRole("button", { name: "Enter workspace" }).click();
	await expect(page.getByText("August payslip is ready")).toBeVisible();
	await page.goto("/employee/payslips");
	await expect(page.getByText("August 2026")).toBeVisible();
});
