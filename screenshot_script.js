const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  await page.goto('http://localhost:5173/admin/leave');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'admin_leave.png' });
  await browser.close();
})();
