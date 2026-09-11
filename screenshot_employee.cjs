const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', 'employee@workforceone.demo');
  await page.fill('input[name="password"]', 'EmployeeDemo#2026');
  await page.click('button.primary.wide');
  await page.waitForNavigation();
  await page.goto('http://localhost:5173/employee/leave');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'employee_leave.png' });
  await browser.close();
})();
