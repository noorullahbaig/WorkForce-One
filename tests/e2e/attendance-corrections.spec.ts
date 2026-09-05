import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: Page, role: "Admin" | "Employee") {
  await page.request.post("/logout", {
    headers: { Origin: "http://127.0.0.1:5173" },
  });
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(role) }).click();
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await expect(page).toHaveURL(role === "Admin" ? /\/admin$/ : /\/employee$/);
  const skipTour = page.getByRole("button", { name: "Skip tour" });
  if (await skipTour.isVisible()) await skipTour.click();
}
async function requestCorrection(page: Page, out: string, reason: string) {
  await page.goto("/employee/attendance?correct=att-001");
  await page.getByLabel("Proposed clock out (Malaysia time)").fill(out);
  await page.getByLabel("Reason for correction", { exact: true }).fill(reason);
  await page.getByRole("button", { name: "Submit correction request" }).click();
  await expect(
    page.getByText(
      "Correction requested. Attendance will change only after approval.",
    ),
  ).toBeVisible();
}
test("employee correction, payroll blocker, approval, rejection and historical warning", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Shared database journey runs once.",
  );
  test.setTimeout(120000);
  await login(page, "Admin");
  const initialReset = await page.request.post("/admin", {
    form: { intent: "reset-demo" },
    headers: { Origin: "http://127.0.0.1:5173" },
  });
  expect(initialReset.ok()).toBeTruthy();
  try {
    await login(page, "Employee");
    await requestCorrection(
      page,
      "2026-08-26T18:30",
      "Forgot the clock-out scan",
    );
    await expect(
      page.getByText("Correction pending admin review"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Request correction", exact: true }),
    ).toHaveCount(0);
    const forbidden = await page.request.post("/employee/attendance", {
      form: {
        intent: "review-attendance-correction",
        id: "forged",
        decision: "approved",
      },
      headers: { Origin: "http://127.0.0.1:5173" },
    });
    expect(await forbidden.text()).toContain("Only admins");
    await login(page, "Admin");
    await page.goto("/admin/payroll/payroll-2026-08");
    await expect(
      page.getByText("1 pending attendance corrections block finalisation"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Finalise payroll" }),
    ).toBeDisabled();
    await page.getByRole("link", { name: "Review corrections" }).click();
    await page
      .getByRole("link", { name: /Farah Iskandar.*Forgot the clock-out scan/ })
      .click();
    await expect(
      page.getByText("9h 30m worked · 1h 30m overtime", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reject correction" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Approve correction" }).click();
    await expect(
      page.getByText("Attendance correction approved.", { exact: true }),
    ).toBeVisible();
    await login(page, "Employee");
    await page.goto("/employee/notifications");
    await expect(
      page.getByText("Attendance correction approved", { exact: true }),
    ).toBeVisible();
    await requestCorrection(
      page,
      "2026-08-26T19:00",
      "Please review this additional time",
    );
    await login(page, "Admin");
    await page.goto("/admin/attendance/corrections");
    await page
      .getByRole("link", { name: /Farah Iskandar.*additional time/ })
      .click();
    await page
      .getByLabel("Rejection reason (required to reject)")
      .fill("The shift ended at 6:30 PM.");
    await page.getByRole("button", { name: "Reject correction" }).click();
    await expect(
      page.getByText("Attendance correction rejected.", { exact: true }),
    ).toBeVisible();
    await page.goto("/admin/attendance/simulate");
    await page.locator('select[name="employeeId"]').selectOption("emp-010");
    await page.getByRole("button", { name: "Capture attendance" }).click();
    await expect(page.getByText(/Clock-out captured/)).toBeVisible();
    await page.goto("/admin/payroll/payroll-2026-08");
    await page.getByRole("button", { name: "Finalise payroll" }).click();
    await expect(
      page.getByText(
        "Payroll finalised. Employee payslips are now available.",
        { exact: true },
      ),
    ).toBeVisible();
    const before = await (
      await page.request.get("/resources/payroll/payroll-2026-08.csv")
    ).text();
    await login(page, "Employee");
    await page.goto("/employee/attendance");
    await page
      .locator("details")
      .filter({ hasText: /rejected/i })
      .locator("summary")
      .click();
    await expect(
      page.getByText("The shift ended at 6:30 PM.", { exact: false }),
    ).toBeVisible();
    await requestCorrection(page, "2026-08-26T18:00", "Historical correction");
    await login(page, "Admin");
    await page.goto("/admin/attendance/corrections");
    await page
      .getByRole("link", { name: /Farah Iskandar.*Historical correction/ })
      .click();
    await expect(
      page.getByText("Finalised payroll period", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Approve correction" }).click();
    expect(
      await (
        await page.request.get("/resources/payroll/payroll-2026-08.csv")
      ).text(),
    ).toBe(before);
  } finally {
    await login(page, "Admin");
    await page.request.post("/admin", {
      form: { intent: "reset-demo" },
      headers: { Origin: "http://127.0.0.1:5173" },
    });
  }
});
test("correction form fits the viewport and supports keyboard and accessible inputs", async ({
  page,
}) => {
  await login(page, "Employee");
  await page.goto("/employee/attendance?correct=att-001");
  await expect(
    page.getByRole("heading", { name: "Request a correction" }),
  ).toBeVisible();
  await page
    .getByLabel("Proposed clock out (Malaysia time)")
    .fill("2026-08-26T18:30");
  await page
    .getByLabel("Reason for correction", { exact: true })
    .fill("Forgot to clock out");
  await expect(
    page.getByText("9h 30m worked · 1h 30m overtime", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Reason for correction", { exact: true }).press("Tab");
  await expect(
    page.getByRole("button", { name: "Submit correction request" }),
  ).toBeFocused();
  await page.screenshot({
    path: `test-results/attendance-correction-${test.info().project.name}.png`,
    fullPage: true,
  });
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .map((e) => ({
        tag: e.tagName,
        class: e.className,
        right: e.getBoundingClientRect().right,
      }))
      .slice(0, 15),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    JSON.stringify(overflow),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .include(".correction-panel")
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({
    path: `test-results/attendance-correction-${test.info().project.name}.png`,
    fullPage: true,
  });
});
