import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, role: "Admin" | "Employee") {
	await page.request.post("/logout");
	await page.goto("/login");
	await page.getByLabel("Email address").fill(role === "Admin" ? "admin@workforceone.demo" : "employee@workforceone.demo");
	await page.getByLabel("Password").fill(role === "Admin" ? "AdminDemo#2026" : "EmployeeDemo#2026");
	await page.getByRole("button", { name: "Enter workspace" }).click();
	await page.waitForURL(role === "Admin" ? /\/admin$/ : /\/employee$/);
	await page.waitForLoadState("networkidle");
	const dismissTour = page.getByRole("button", { name: "Not now" });
	if (await dismissTour.isVisible()) await dismissTour.click();
}

	test("employee plans leave in the shared calendar", async ({ page }) => {
	await signIn(page, "Employee");
	await page.goto("/employee/leave?month=2099-01&date=2099-01-02&request=new");

	if ((page.viewportSize()?.width ?? 2000) > 1199) {
		await expect(page.getByRole("grid", { name: "January 2099 shared leave calendar" })).toBeVisible();
	}
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
	
	if ((page.viewportSize()?.width ?? 2000) <= 1199) {
		return; // Calendar is hidden by design when request is open on narrow viewports
	}

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
	await page.goto("/employee/leave?month=2099-01&date=2099-01-02&request=new");
	await page.getByLabel("Reason").fill("Personal appointment");
	await page.getByRole("button", { name: "Submit leave request" }).click();

	await expect(page).toHaveURL(/\/employee\/leave\?month=2099-01&date=2099-01-02$/);
	await expect(page.getByRole("status")).toContainText("Leave request sent for approval.");
	await expect(page.getByRole("complementary", { name: "Selected date details" })).toBeVisible();
	await expect(page.getByRole("complementary", { name: "Request leave" })).toHaveCount(0);
  await page.getByRole("link", {name: "My requests", exact: true}).click();
  await page.getByRole("link", {name: /Annual leave.*2099/}).click();
  await page.getByRole("button", {name: "Withdraw request"}).click();
  await expect(page.getByRole("complementary", {name: "Request details"})).toContainText("withdrawn");
  await expect(page.getByRole("button", {name: "Withdraw request"})).toHaveCount(0);


	await page.getByRole("button", { name: "Sign out" }).first().click();
	await page.waitForURL(/\/login/);
	await page.getByRole("button", { name: /Admin/ }).click();
	await page.getByRole("button", { name: "Enter workspace" }).click();
	await page.waitForURL(/\/admin$/);
	const dismissTour = page.getByRole("button", { name: "Not now" });
	if (await dismissTour.isVisible()) await dismissTour.click();
	await page.request.post("/admin", {
		form: { intent: "reset-demo" },
		headers: { Origin: "http://127.0.0.1:5173" },
	});
});

test("admin can switch between calendar planning and the review queue", async ({ page }) => {
	await signIn(page, "Admin");
	await page.goto("/admin/leave?month=2026-08");

	await page.getByRole("button", { name: "Filters" }).click();
	await expect(page.getByRole("combobox", { name: "Department" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Employee" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Events" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Status" })).toBeVisible();

	await expect(page.getByRole("heading", { name: "Approval queue" })).toBeVisible();

	const accessibility = await new AxeBuilder({ page }).analyze();
	expect(accessibility.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(" ")) }))).toEqual([]);
});

test("admin calendar fits the initial laptop viewport", async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== "desktop", "Laptop viewport assertion runs once.");
	await page.setViewportSize({ width: 1366, height: 768 });
	await signIn(page, "Admin");
	await page.goto("/admin/leave?month=2026-08");

	const calendar = page.getByRole("grid", { name: "August 2026 shared leave calendar" });
	await expect(calendar).toBeVisible();
	const calendarBox = await calendar.boundingBox();
	expect(calendarBox).not.toBeNull();
	expect(calendarBox!.y + calendarBox!.height).toBeLessThanOrEqual(768);
	expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(768);
});


test("employee leave tabs preserve context and browser navigation", async ({ page }) => {
  await signIn(page, "Employee");
  await page.goto("/employee/leave?month=2026-08&date=2026-08-25&view=calendar");
  await page.getByRole("link", { name: "My requests", exact: true }).click();
  await expect(page).toHaveURL(/panel=requests/);
  await expect(page.getByRole("grid")).toHaveCount(0);
  const rows = page.locator(".employee-request-row");
  if (await rows.count()) {
    await rows.first().click();
    await expect(page.getByRole("complementary", {name: "Request details"})).toContainText("Submitted");
    await page.reload();
    await expect(page.getByRole("complementary", {name: "Request details"})).toContainText("Submitted");
  }
  await page.getByRole("link", { name: "Schedule", exact: true }).click();
  await expect(page).toHaveURL(/month=2026-08&date=2026-08-25&view=calendar/);
  await expect(page.getByRole("grid")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("link", {name: "My requests", exact: true})).toHaveAttribute("aria-current", "page");
});

test("employee leave fits desktop and remains usable across viewport widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Responsive matrix runs once.");
  await signIn(page, "Employee");
  for (const width of [1366, 1024, 820, 390, 320]) {
    await page.setViewportSize({width, height: 768});
    await page.goto("/employee/leave?month=2026-08&date=2026-08-25");
    await expect(page.getByRole("link", {name: "Request leave", exact: true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const canvasBox = await page.locator(".calendar-canvas").boundingBox();
    const agendaBox = await page.getByRole("link", {name: "Agenda", exact: true}).boundingBox();
    expect(agendaBox!.x + agendaBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
    if (width === 1366) {
      const calendar = await page.getByRole("grid").boundingBox();
      expect(calendar!.y + calendar!.height).toBeLessThanOrEqual(768);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(768);
      await page.screenshot({path: "test-results/employee-leave-desktop.png"});
      const collapse = page.getByRole("button", {name: "Collapse navigation"});
      if (await collapse.count()) {
        await collapse.click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await page.getByRole("button", {name: "Expand navigation"}).click();
      }
    }
    if (width <= 700) await expect(page.getByRole("region", {name: "Leave agenda"})).toBeVisible();
    await page.getByRole("link", {name: "Request leave", exact: true}).click();
    await expect(page.getByRole("complementary", {name: "Request leave"})).toBeVisible();
    if (width < 1200) await expect(page.getByRole("grid")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 320) await page.screenshot({path: "test-results/employee-leave-mobile.png", fullPage: true});
  }
});


test("calendar contents remain reachable in short desktop windows", async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Viewport matrix runs once.");
  test.setTimeout(90000);
  for (const role of ["Employee","Admin"] as const) {
  await signIn(page,role);
  for (const width of [1024,1366]) for (const height of [550,650,768,900]) for (const collapsed of [false,true]) {
    await page.setViewportSize({width,height});
    await page.goto(`/${role.toLowerCase()}/leave?month=2026-08&date=2026-08-25&view=calendar`);
    await page.waitForLoadState("networkidle");
    const toggle=page.getByRole("button",{name:collapsed?"Collapse navigation":"Expand navigation"});
    if (await toggle.count()) await toggle.click();
    await expect(page.locator(".navigation-rail")).toHaveClass(collapsed?/is-collapsed/:/is-expanded/);
    await expect.poll(()=>page.locator(".leave-calendar").getAttribute("data-density")).not.toBeNull();
    const geometry = await page.evaluate(()=>({
      height:innerHeight, pageHeight:document.documentElement.scrollHeight,
      viewport:document.querySelector(".calendar-viewport").clientHeight,
      grid:document.querySelector(".leave-calendar").getBoundingClientRect().height,
      clipped:[...document.querySelectorAll(".calendar-date,.calendar-event,.calendar-summary,.calendar-events>small")].filter(el=>{
        if(!el.getClientRects().length) return false;
        const cell=el.closest(".calendar-day").getBoundingClientRect(),box=el.getBoundingClientRect();
        return box.bottom>cell.bottom+.5 || box.right>cell.right+.5;
      }).length,
      minRow:Math.min(...[...document.querySelectorAll(".calendar-day")].map(el=>el.getBoundingClientRect().height)),
    }));
    expect(geometry.pageHeight,JSON.stringify({width,height,collapsed,geometry})).toBeLessThanOrEqual(height);
    expect(geometry.minRow).toBeGreaterThanOrEqual(40);
    expect(geometry.clipped,JSON.stringify({width,height,collapsed,geometry})).toBe(0);
    expect(geometry.grid,JSON.stringify({width,height,collapsed,geometry})).toBeLessThanOrEqual(geometry.viewport+1);
    await expect(page.getByRole("complementary",{name:"Take a quick PayME tour"})).toHaveCount(0);
  }
  }
});

test("submission notice is consumed without resizing the calendar", async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop","Geometry runs once.");
  await signIn(page,"Employee");
  await page.setViewportSize({width:1366,height:650});
  const path="/employee/leave?month=2026-08&date=2026-08-25&view=calendar";
  await page.goto(path);
  const before=await page.getByRole("grid").boundingBox();
  await page.goto(path+"&notice=leave-submitted&noticeId=test-notice");
  await expect(page).toHaveURL(new RegExp("view=calendar$"));
  await expect(page.getByRole("status")).toContainText("Leave request sent for approval.");
  expect(await page.getByRole("grid").boundingBox()).toEqual(before);
  await expect(page.getByRole("status")).toHaveCount(0,{timeout:6000});
  expect(await page.getByRole("grid").boundingBox()).toEqual(before);
  await page.reload();
  await expect(page.getByText("Leave request sent for approval.")).toHaveCount(0);
  await page.goto(path+"&notice=leave-submitted&noticeId=navigate-away");
  await expect(page.getByRole("status")).toContainText("Leave request sent for approval.");
  await page.getByRole("link",{name:"Payslips",exact:true}).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/view=calendar$/);
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole("status")).toHaveCount(0);
});


test("leave server errors stay beside the form with one announcement", async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop","Mutates only the local demo database.");
  await signIn(page,"Employee");
  const path="/employee/leave?month=2099-01&date=2099-01-07&request=new";
  await page.goto(path);
  await page.getByLabel("Reason").fill("Server validation test");
  await page.getByRole("button",{name:"Submit leave request"}).click();
  await expect(page.getByRole("complementary",{name:"Selected date details"})).toBeVisible();
  await page.goto(path);
  await page.getByLabel("Reason").fill("Overlapping request");
  await page.getByRole("button",{name:"Submit leave request"}).click();
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.getByRole("complementary",{name:"Request leave"})).toContainText("dates overlap");
  await page.waitForTimeout(7000);
  await expect(page.getByRole("alert")).toHaveCount(1);
  await page.getByRole("link",{name:"Cancel",exact:true}).click();
  await page.getByRole("link",{name:"My requests",exact:true}).click();
  await page.getByRole("link",{name:/Annual leave.*7 Jan 2099/}).click();
  await page.getByRole("button",{name:"Withdraw request"}).click();
  await expect(page.getByRole("complementary",{name:"Request details"})).toContainText("withdrawn");
});

test("crowded mobile dates expose their overflow and full event descriptions", async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=="mobile","Crowded mobile CSS runs once.");
  await signIn(page,"Admin");
  const prefix="Calendar overflow fixture";
  const ids:string[]=[];
  try {
    for(let i=0;i<8;i++) {
      const response=await page.request.post("/admin/leave/holidays",{headers:{Origin:"http://127.0.0.1:5173"},form:{intent:"save-holiday",name:`${prefix} ${i}`,date:"2099-02-02"}});
      expect(response.ok()).toBeTruthy();
    }
    await page.goto(`/admin/leave/holidays?q=${encodeURIComponent(prefix)}`);
    for(const input of await page.locator('.holiday-list article input[name="id"]').all()) ids.push(await input.inputValue());
    expect(ids).toHaveLength(8);
    await signIn(page,"Employee");
    for(const width of [320,390]) {
      await page.setViewportSize({width,height:844});
      await page.goto("/employee/leave?month=2099-02&date=2099-02-02&view=calendar");
      const cell=page.locator('.calendar-day').filter({has:page.locator('[data-calendar-date="2099-02-02"]')});
      await expect(cell.locator('.calendar-events>small')).toBeVisible();
      await expect(cell.locator('.calendar-events>small')).toHaveText(/\+\d+ more/);
      await expect(cell.locator('[data-calendar-date]')).toHaveAttribute("aria-label",new RegExp(`${prefix} 7`));
      await expect(page.getByRole("complementary",{name:"Selected date details"})).toContainText(`${prefix} 7`);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  } finally {
    await signIn(page,"Admin");
    for(const id of ids) await page.request.post("/admin/leave/holidays",{headers:{Origin:"http://127.0.0.1:5173"},form:{intent:"archive-holiday",id}});
  }
});
