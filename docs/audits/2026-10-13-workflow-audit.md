# Workforce One: workflow and simulation audit

**Audit date:** 13 October 2026, Asia/Kuala_Lumpur (MYT, UTC+8)  
**Status:** All13 reproduced findings resolved and verified in the local release candidate. Live deployment unchanged. See the remediation record below.  
**Purpose:** Internal engineering record and reproducible work backlog.  
**Local source:** `0b4398ba1ee1f1bc98071e3bbc6e19a8d55f5fea`  
**Live deployment:** [Workforce One](https://workforce-one-hrms-demo.noorullahbaig31.workers.dev/employee/profile)

## Executive assessment

The connected demonstration works on its ordinary paths: employee/admin sign-in, protected navigation, sign-out, attendance capture, leave submission and review, correction approval/rejection, payroll blockers, finalisation, notifications, and protected payslips. Thirty browser login/navigation/attendance/logout cycles completed with exactly thirty additional attendance records and no remaining open shifts for the current day. Thirty additional simulated workdays produced the expected UTC timestamps, worked minutes, and overtime for ordinary single shifts.

The audit identified **13 reproduced findings: 5 P1, 7 P2, and 1 P3**. Prioritise company isolation on downloads, duplicate/overnight attendance, daily overtime across split shifts, and payroll PDF pagination. These are meaningful gaps even though the existing automated suites pass. This report does not certify statutory calculations or production readiness.

**Severity:** P1 = high impact on confidentiality, attendance/payroll correctness, or completeness; P2 = material validation, demo reliability, accessibility, or document usability gap; P3 = narrow robustness gap. Severity describes the effect when triggered, not how frequently the seeded demo triggers it. In particular, the company-isolation finding was reproduced in an isolated second-company fixture; the live demo currently exposes one seeded company, and no live cross-company data was accessed.

## Environment, method, and evidence

- Live `/healthz` reports the service ready, migrations applied, and required holiday/backdate/correction schema present. [Captured health](../../output/playwright/audit-2026-10-13/live-health.json).
- The deployment does not expose a commit identifier. Its observed routes, seeded company, role workflows, and UI agree with local behavior, but exact live/local build equivalence was **not verified**. Local findings are labelled accordingly.
- Local browser journeys used a separate copy at `/tmp/workforce-audit-2026-10-13` with its own Wrangler/D1 SQLite state. The normal development database was not used. Dependencies were shared through a symlink; the temporary copy's Vite filesystem allow-list was extended to resolve that symlink. No application behavior was changed.
- The default shell has Node 22.14.0; the initial unit suite passed there. Local Worker/browser runs used bundled Node 24.19.0, satisfying the repository's Node >=24 requirement.
- Seed baseline: Merdeka Coffee, ten employees, July finalised payroll/Farah payslip, August draft payroll, two missing clock-outs, leave records and notifications.
- Browser sizes: 1440×900, 768×844 in exploratory checks, 390×844 and 360×844; the existing suite additionally uses its configured 768×1024 and 360×800 viewports. Browser engine: Chromium.
- Live changes were authentication sessions only. No live business records, payrolls, or demo resets were submitted. Mutable business simulations were local. No deployment, application fix, or source modification was made.
- Screenshots containing unnecessary profile banking/identity details were excluded. Evidence scripts read demo passwords from the existing README and do not print session tokens or credentials.

[Environment manifest](../../output/playwright/audit-2026-10-13/environment.json) · [Evidence and rerun instructions](../../output/playwright/audit-2026-10-13/README.md)

### Execution results

| Run | Outcome | Evidence |
| --- | --- | --- |
| Existing unit/integration suite | **Pass:** 125/125 tests, 21 files | [Log](../../output/playwright/audit-2026-10-13/unit-tests.log) |
| Existing browser suite, four viewport projects | **Pass:** 49 tests; **Not tested:** 39 intentional skips | [Log](../../output/playwright/audit-2026-10-13/e2e-tests.log) |
| Live exploratory browser checks | 32 Pass, 1 Fail, across 33 scenarios; failure is contrast | [Results](../../output/playwright/audit-2026-10-13/live-results.json) |
| Controlled server/D1 simulations | 10 Pass, 7 Fail, across 17 assertions; failed assertions preserve defects | [Results](../../output/playwright/audit-2026-10-13/server-simulations.json), [log](../../output/playwright/audit-2026-10-13/server-simulations.log) |
| Extended local browser use | All 30 individual cycles Pass; additional workflow checks and first-run harness errors retained | [Results](../../output/playwright/audit-2026-10-13/local-results.json) |
| Supplemental local reconciliation/recovery | 9 Pass, 2 Fail across 11 checks; payslip itemisation and reset failures | [Results](../../output/playwright/audit-2026-10-13/supplement-results.json) |
| HTTP edge cases | 2 Pass, 2 Fail across 4 checks; duplicate attendance and impossible date reproduced over HTTP | [Results](../../output/playwright/audit-2026-10-13/edge-results.json) |
| Synthetic PDF checks | 1 generation check Pass; 2 assertions Fail; extracted text and rendered pages reviewed | [Log](../../output/playwright/audit-2026-10-13/pdf-simulations.log), [content review](../../output/playwright/audit-2026-10-13/pdf-content-review.json) |

Do not add these counts into a unique-test total: scenarios overlap, repeated cycles have their own entries, and observation entries are evidence rather than assertions. Existing browser skips mostly avoid repeating shared mutable scenarios or desktop-only layouts; they are not passes.

### Chronological execution log

Times are MYT; approximate ranges are reconstructed from command timestamps and retained run logs.

| Time, 13 October | Work and result |
| --- | --- |
| 15:14, planning inspection | Live health and unauthenticated deep-link redirect checked; repository accounts and test architecture inspected. |
| 16:56–16:59 | Existing unit suite: 125 passed. Separate local copy, migrations and seed prepared; live employee deep-link login inspected. |
| 16:58–16:59 | First isolated browser-suite attempt blocked by Vite dependency symlink allow-list. Temporary harness configuration corrected; no product finding raised. |
| 16:59–17:03 | Existing full browser suite rerun: 49 passed, 39 skipped. Live role/navigation, layout, logout, and accessibility exploration completed. |
| 17:02–17:08 | Deterministic timestamp/D1 simulations and 30-day sequence; attendance defects reproduced. Added split-shift and second-company export fixtures. |
| 17:07–17:11 | Thirty actual browser usage cycles and local validation/profile/leave checks completed. |
| 17:11–17:15 | Harness classification retests; interrupted-write recovery, payroll/export reconciliation, payslip ownership, and reset checks. |
| 17:15–17:17 | HTTP duplicate submissions and impossible-date persistence confirmed; leave cutoff/rejection boundaries checked. |
| 17:17 onward | Large-report and Unicode PDF simulations; PDF text extraction, rendered-page inspection, report assembly and evidence review. |

## Coverage matrix

A row can include both successful paths and failed edges. See the finding IDs for the latter.

| Area | Status and evidence-backed coverage | Boundaries |
| --- | --- | --- |
| Authentication | **Pass:** both roles, invalid password locally, deep-link return, refresh, role redirect, logout, Back/reload, other-tab logout, copied-token invalidation | Actual 24-hour browser wait not performed. |
| Session time and throttle | **Pass:** service-level clock simulation just before/exactly at 24-hour expiry; eight failed logins throttle; valid login succeeds after 15 min 1 sec | Server service time was mocked in disposable tests; live Worker clock unchanged. |
| Attendance | **Pass:** QR/fingerprint demo actions, UTC storage, 30 cycles, 30 simulated days, two completed sessions/day, repeated clock-out rejection | **Fail:** duplicate active shifts, overnight lookup, split-shift OT, invalid-time handling (WF-002/003/004/009/010). Hardware scans are simulated. |
| Time/date boundaries | **Pass:** MYT midnight, month/year/leap-day date math, overnight duration arithmetic, minute-rounding fixtures | **Fail:** overnight action lookup. Boundaries were checked at helper/handler level, not by moving the deployed server clock. |
| Browser clock/timezone | **Pass:** browser set to 1 Jan 2030 while Worker stored actual 13 Oct 2026 work date; New York and Kuala Lumpur attendance text matched | No OS clock modification. |
| Attendance corrections | **Pass:** employee request, pending blocker, approval/rejection, original/proposed values, stale decisions, concurrency, ownership, correction-linked reset protection | Existing browser journeys plus D1 integration tests; see unit/E2E logs. |
| Leave | **Pass:** submission, overlap/balance rejection, blank reason, holiday/weekend arithmetic, withdrawal, required rejection reason, approval, cancellation, reservation release, notifications, exact three-day backdate cutoff | **Fail:** impossible calendar date accepted (WF-007). Exhaustive national holiday/statutory policy certification not performed. |
| Payroll handoffs | **Pass:** missing attendance and pending-correction blockers, finalisation after resolution, repeated finalisation, employee notification/payslip | Post-finalisation correction immutability verified by existing D1 integration tests. |
| Payroll exports | **Pass:** ten-row CSV totals equal stored totals; PDF valid header; employee denied admin CSV; own PDF allowed/other employee PDF 404 | **Fail:** foreign-company admin downloads and report truncation (WF-001/012); Unicode generator failure (WF-013). |
| Payslip itemisation | **Fail:** screen omits bonus/manual deduction, PDF omits manual deduction despite correct totals (WF-005) | Synthetic PDF content and actual local finalisation reviewed; no statutory certification. |
| Profile | **Pass:** save/reload persistence and keyboard focus on edit; recovery after interrupted write | **Fail:** malformed values accepted by server (WF-008). Full keyboard traversal of every screen not performed. |
| Notifications | **Pass:** approval/cancellation delivery, mark-read persistence, payroll notification journey | No external email/SMS channel in this audit. |
| Daily navigation/onboarding | **Pass:** main employee/admin routes, role tours/replay, focused inspector and navigation layouts; existing empty/error states in browser tests | A live `pageerror` with message `Response` was logged without a visible failed workflow; not classified as a reproduced product defect. |
| Responsive/accessibility | **Pass:** sampled routes fit all tested widths; correction/leave accessibility and viewport tests pass | **Fail:** live attendance contrast (WF-011). Not a full WCAG certification; Safari, Firefox, screen-reader and physical-device checks **Not tested**. |
| Repetition/recovery | **Pass:** 30 browser cycles, no extra rows or current-day open shifts; aborted GET reload recovery; aborted profile write persisted nothing and retry succeeded | Payment/attendance POST connection loss *after server commit* is **Not tested**. Duplicate attendance requests fail independently. |
| Demo reset | **Pass:** attendance/leave/profile restore, correction restore, preserved auth sessions in established reset behavior | **Fail:** custom payroll adjustments survive (WF-006). Actual scheduled 03:00 MYT cron delivery **Not tested**; schedule inspected only. |
| Sustained/large-scale usage | **Pass:** bounded 30-cycle browser use and 30-day handler simulation | **Fail:** 30-person PDF truncation. Load testing, multi-hour soak, and large-tenant query performance **Not tested**. |

## Prioritised findings

At the original audit, all findings below were **Open**. Their descriptions and failure evidence are preserved. The appended remediation record gives current status and post-fix verification.

### WF-001 — P1 — Company ownership missing from protected document downloads

**Classification/environment:** Reproduced confidentiality defect, isolated D1/service fixture; live second-company access not attempted.

**Reproduce:** Create another company in a disposable database, assign the seeded July payroll and its employee to it, retain an authenticated administrator of the original company, then invoke payroll CSV, bank CSV, payroll PDF, and payslip PDF loaders with the foreign identifiers.

**Expected:** Original-company administrator receives 403/404 for every foreign-company document. **Actual:** All four loaders return HTTP 200, with CSV/PDF bytes. Employee-versus-admin role checks work; company ownership checks are absent.

**Impact/cause:** A valid administrator can obtain another company's salaries, bank details and payslips if identifiers are known. The loaders query by record ID without binding `user.companyId`; payslip ownership is checked only for the employee role.

**Next action / acceptance:** Scope every resource query to authenticated company membership; add two-company tests covering admin and employee access. Preserve valid same-company downloads. [Evidence](../../output/playwright/audit-2026-10-13/server-simulations.json), entry `cross-company-resource-observation`. Sources: `app/routes/payroll-csv.ts`, `bank-csv.ts`, `payroll-pdf.ts`, `payslip-pdf.ts`.

### WF-002 — P1 — Duplicate clock-ins create multiple active shifts

**Classification/environment:** Reproduced functional defect, isolated D1 handler and local HTTP.

**Reproduce:** From one employee session, submit two concurrent `employee-clock` / `clock-in` requests for the same date. **Expected:** One open shift and a safe repeat/error response. **Actual:** Both requests return success/HTTP 200; two new open attendance rows persist.

**Impact/cause:** Double taps, stale tabs, or retries can leave an extra missing clock-out, confuse active-shift selection, and block payroll. The insert has no open-shift guard; migration 0002 removed the former employee/date uniqueness to allow multiple shifts.

**Next action / acceptance:** Enforce at most one active shift per employee atomically while retaining multiple *completed* sessions. Verify concurrent requests and retry behavior. [HTTP evidence](../../output/playwright/audit-2026-10-13/edge-results.json), [screenshot](../../output/playwright/audit-2026-10-13/local-duplicate-clockins.png). Source: `app/features/attendance/clock.server.ts:89`.

### WF-003 — P1 — Overnight shift cannot be clocked out after midnight

**Classification/environment:** Reproduced workflow limitation, controlled local handler timestamps.

**Reproduce:** Clock in at **3 Feb 2027, 22:00 MYT** (`14:00Z`), then clock out at **4 Feb, 06:00 MYT** (`3 Feb 22:00Z`). **Expected:** Close the existing shift with 480 worked minutes. **Actual:** `No open shift found. Refresh and check the record.` The original shift remains open.

**Impact/cause:** Overnight workers cannot complete attendance normally; records can block payroll. Both the handler and employee UI filter open sessions by today's work date. Duration arithmetic itself supports overnight timestamps and passed.

**Next action / acceptance:** Define the intended overnight work-date policy, then locate an employee's active shift across midnight and show it consistently on home/attendance. Cover month/year/leap-day rollover at action/UI level. [Evidence](../../output/playwright/audit-2026-10-13/server-simulations.json), `overnight-observation`. Source: `app/features/attendance/clock.server.ts:47` and `attendance-ui.tsx:331`.

### WF-004 — P1 — Split shifts undercount daily overtime

**Classification/environment:** Reproduced calculation defect, isolated attendance and payroll aggregation.

**Reproduce:** On 9 Feb 2027, complete 08:00–13:00 and 14:00–19:00 MYT sessions. **Expected under the bundled eight-hour normal-day policy:** 600 worked minutes, 480 regular, 120 overtime. **Actual:** 600 worked/regular minutes, zero overtime.

**Impact/cause:** Overtime is calculated separately for each session and aggregated without grouping by employee/day. Multiple completed sessions are supported by the UI, making this a supported-path calculation gap, rather than a statutory interpretation claim.

**Next action / acceptance:** Compute daily regular/OT allocation across sessions and ensure employee totals, admin attendance, and payroll agree. [Evidence](../../output/playwright/audit-2026-10-13/server-simulations.json), `split-shift-observation`. Sources: `app/domain/attendance.ts:26`, `app/features/payroll/attendance-inputs.ts`.

### WF-005 — P2 — Payslip line items do not explain totals

**Classification/environment:** Reproduced document/UI defect, local browser finalisation and synthetic PDF.

**Reproduce:** Add RM100 bonus and RM25 manual deduction for Farah, resolve attendance, finalise August payroll, and view her payslip. **Expected:** Earnings and deduction lines sum to the displayed totals. **Actual:** Web earnings omit the RM100 bonus; deductions omit RM25. In the captured screen, visible earnings sum to RM6,558.59 but gross is RM6,658.59; visible deductions sum to RM917.65 but total deductions are RM942.65. The PDF includes a bonus line but still omits the manual deduction.

**Impact/cause:** Correct stored totals appear unexplained to employees. Unpaid-leave deductions are also absent from the rendering code; that specific case is a source-review concern, not a separately executed payslip scenario.

**Next action / acceptance:** Render all applicable breakdown fields consistently in web/PDF; require displayed lines to reconcile to gross, deductions, and net. [Actual screenshot](../../output/playwright/audit-2026-10-13/local-payslip-missing-lines.png), [synthetic PDF review](../../output/playwright/audit-2026-10-13/pdf-content-review.json). Sources: `app/routes/portal.tsx` (`PayslipDetail`), `app/services/pdf.server.ts:32`.

### WF-006 — P2 — Demo reset retains custom payroll adjustments

**Classification/environment:** Reproduced demo reliability defect, local browser/API.

**Reproduce:** Add a custom bonus and deduction, finalise payroll, then use admin demo reset. **Expected:** Business inputs return to the baseline demo state. **Actual:** Both custom adjustments remain in `payroll_adjustments` while the payroll becomes draft again.

**Impact/cause:** Successive presentations can accumulate adjustments and produce different salaries after a supposed reset. `resetDemoData` clears results/payslips but does not restore/delete custom payroll adjustments.

**Next action / acceptance:** Restore the complete baseline adjustment set and verify repeated reset/finalisation yields identical totals. Confirm manual and scheduled resets use the same safe behavior. [Evidence](../../output/playwright/audit-2026-10-13/supplement-results.json). Source: `app/services/reset.server.ts`.

### WF-007 — P2 — Impossible leave dates persist

**Classification/environment:** Reproduced validation defect, domain function and local HTTP.

**Reproduce:** Submit leave with start `2027-02-30`, end `2027-03-02`, valid leave type/reason. **Expected:** Reject the nonexistent date without inserting anything. **Actual:** HTTP 200; a request persists with literal start `2027-02-30` and duration two half-days.

**Impact/cause:** Date parsing normalises February 30 into March, while the database retains the invalid original string. Calendar, overlap and balance logic can therefore describe different periods. Native date-input restrictions do not replace server validation.

**Next action / acceptance:** Validate canonical calendar dates before policy, duration, and storage checks; cover non-leap February 29, February 30, and invalid day/month combinations. [Evidence](../../output/playwright/audit-2026-10-13/edge-results.json), `invalid-date-http-observation`. Source: `app/domain/leave.ts:38`.

### WF-008 — P2 — Profile server accepts malformed contact/banking values

**Classification/environment:** Reproduced validation defect, local HTTP.

**Reproduce:** Submit `update-self-profile` with email `not-an-email`, phone `letters-only`, and account `not-a-bank-account`. **Expected:** Field-specific validation error and no mutation. **Actual:** HTTP 200 and malformed contact data persists; only nonempty phone/email are checked. An ordinary valid profile save/reload passed.

**Impact/cause:** Requests can bypass browser email validation; phone/account inputs have no equivalent format validation. Invalid employee data can reach administrative/export flows.

**Next action / acceptance:** Define and enforce suitable server schemas and sensible field lengths; retain legitimate Malaysian/international phone formats and any deliberately optional bank-account behavior. Add no-mutation-on-error checks. [Evidence](../../output/playwright/audit-2026-10-13/local-results.json). Source: `app/routes/portal.tsx:185`.

### WF-009 — P2 — Admin attendance capture crashes for later-starting shifts

**Classification/environment:** Reproduced handler exception, isolated timestamp/D1 fixture.

**Reproduce:** Give an employee an open shift starting 7 Feb 2027 at 20:00 MYT, then invoke admin capture. **Expected:** A valid later clock-out or a controlled validation message. **Actual:** `Clock out must be after clock in` escapes the handler because capture always chooses 18:15 MYT on the original work date.

**Impact/cause:** The fixed-time demo capture assumption breaks on valid evening records or corrected start times. An actual HTTP status for this exact synthetic late shift was not asserted; the exception was observed directly.

**Next action / acceptance:** Expose an appropriate capture time or reject incompatible demo records explicitly; never let calculation exceptions become an unhandled action failure. [Evidence](../../output/playwright/audit-2026-10-13/server-simulations.log). Source: `app/features/attendance/clock.server.ts:118`.

### WF-010 — P3 — Equal clock-in/out timestamp throws instead of validating

**Classification/environment:** Reproduced handler robustness gap, deterministic local timestamps.

**Reproduce:** Pass identical `2027-02-06T01:00:00Z` timestamps to employee clock-in/out actions. **Expected:** A recoverable validation response. **Actual:** Attendance calculation throws and the clock action does not catch it.

**Impact/cause:** Narrow same-instant/frozen-time/replayed-time case; ordinary browser round trips did not reproduce it. This is not evidence that ordinary short shifts fail: rounding fixtures and thirty short browser shifts passed.

**Next action / acceptance:** Catch/validate impossible ordering and return a useful message without modifying the open shift. [Evidence](../../output/playwright/audit-2026-10-13/server-simulations.log). Source: `app/domain/attendance.ts:22` and `clock.server.ts:59`.

### WF-011 — P2 — Live attendance contrast fails accessibility checks

**Classification/environment:** Reproduced accessibility defect, live Chromium/axe.

**Reproduce:** Open employee Attendance at desktop width and run axe with color-contrast enabled. **Expected:** WCAG AA text contrast. **Actual:** One serious `color-contrast` rule violation affecting three targets: `.eyebrow`, page description, and `.pending` status.

**Impact/cause:** Muted text/status colors are hard to read, especially on the dark clock panel. Existing admin smoke accessibility tests explicitly disable the color-contrast rule, so their pass does not cover this issue.

**Next action / acceptance:** Adjust tokens/text colors, verify ratios, and keep contrast enabled for employee attendance in regression checks. [Axe evidence](../../output/playwright/audit-2026-10-13/live-accessibility.json), [desktop](../../output/playwright/audit-2026-10-13/live-attendance-1440.png), [mobile](../../output/playwright/audit-2026-10-13/live-attendance-360.png).

### WF-012 — P1 — Payroll PDF silently drops employees beyond row 22

**Classification/environment:** Reproduced document completeness defect, synthetic 30-person generator fixture.

**Reproduce:** Generate a payroll report with thirty distinct employees using the existing PDF generator. **Expected:** All thirty rows across enough pages, with reconcilable totals. **Actual:** One page contains only employees 1–22; employees 23–30 are absent. Totals still include all thirty employees (RM33,000 gross in the fixture).

**Impact/cause:** A seemingly complete payroll export silently omits eight employees while reporting a full total. The generator exits its row loop at the page bottom without creating another page.

**Next action / acceptance:** Implement pagination, repeated column headings and safe total/footer placement. Verify 0, 1, 22, 23, 30, and larger row counts by extracted content and rendered pages. [Content evidence](../../output/playwright/audit-2026-10-13/pdf-content-review.json), [rendered page](../../output/playwright/audit-2026-10-13/synthetic-payroll-30.png), [PDF](../../output/playwright/audit-2026-10-13/synthetic-payroll-30.pdf). Source: `app/services/pdf.server.ts:17`.

### WF-013 — P2 — Non-Latin employee names break PDF generation

**Classification/environment:** Reproduced generator exception, synthetic local payroll fixture.

**Reproduce:** Generate a payroll report for an employee named `王美玲`. **Expected:** A readable PDF preserving the employee name. **Actual:** Generation rejects with `WinAnsi cannot encode "王" (0x738b)`.

**Impact/cause:** Embedded standard Helvetica cannot encode common Malaysian non-Latin names. Payroll PDF failure was executed; payslip uses the same font strategy, but a separate payslip Unicode scenario was not executed.

**Next action / acceptance:** Embed appropriate Unicode fonts and exercise Chinese/Tamil names, diacritics, and long names in actual exports. [Evidence](../../output/playwright/audit-2026-10-13/pdf-simulations.log). Source: `app/services/pdf.server.ts:14`.

## Work order and remaining investigations

1. **Confidentiality and financial correctness:** WF-001, WF-002, WF-003, WF-004, WF-012. Add failing regression cases before remediation; keep completed-session support and correct same-company downloads.
2. **Trustworthy demo and employee explanations:** WF-005, WF-006, WF-007, WF-008, WF-009, WF-013. Retest the full attendance → leave → payroll → payslip walkthrough after these changes.
3. **Accessibility and robustness:** WF-011 and WF-010. Recheck desktop/mobile contrast and controlled ordering errors.

### Source-review concerns, not counted as reproduced defects

- **C-01:** Several admin mutation branches (for example add/delete payroll adjustments) use record identifiers without explicit company/status validation in the branch. This merits targeted cross-company and finalised-run mutation tests. WF-001 covers confirmed download leakage only.
- **C-02:** Bank exports and payslip headers join current employee identity/bank fields rather than visibly consuming a finalised employee snapshot. Decide the intended treatment of post-finalisation profile changes, then test it; this audit does not classify the current policy as defective without that decision.
- **C-03:** Both dashboards use a fixed “Good morning” greeting even during the afternoon audit. Low-priority copy improvement; calendar dates themselves matched MYT.
- **C-04:** Live browser instrumentation recorded one generic `Response` page error. All assertions around navigation/logout still passed. Its cause and user impact remain unconfirmed; retain the observation for a targeted trace if it recurs.

### Explicit limitations and next audit extensions

- No precise deployed-commit parity proof, browser matrix beyond Chromium, physical fingerprint/QR hardware, GPS verification, full screen-reader audit, actual cron-delivery observation, statutory payroll certification, or sustained load/soak testing.
- The thirty-day sequence calls actual attendance handlers against D1 using explicit `today`/`now`; it is not thirty days of wall-clock UI execution. Browser clock skew, service session time, and server-handler timestamps are distinct evidence types.
- Interrupted writes were aborted before persistence. Lost responses after successful commits and automatic client replay deserve separate tests; the duplicate-clock-in finding makes that particularly important.
- The audit log is complete for this bounded run. **Not tested** rows must remain visible when using it to decide readiness; passing suites do not override the reproduced failures.

## Maintenance and retest log

For each remediation, append: date, finding ID, fixing commit, exact regression scenario/command, environment, outcome, and evidence link. Change a finding to **Resolved** only after its reproduction stops failing and connected workflows still pass. Preserve original failure evidence.

| Date | Finding | Commit | Verification | Result |
| --- | --- | --- | --- | --- |
| 2026-10-13 | WF-001–WF-013 | Audited commit above | Initial audit and reproductions | Open; no product changes |

## Remediation record: verified local release candidate

**Branch:** `codex/audit-remediation`  
**Verified source commit:** `8397eeb`  
**Release status:** Ready for deployment review. No merge, push, deployment or live business-data reset was performed. The deployed site still runs its previous version; “Resolved” below means the local candidate passed its reproductions and connected regression checks.

### Agreed operating policy

- Active shifts span midnight for up to24 hours inclusive. Older gaps remain exceptions and prominently prompt correction, without blocking a new shift.
- Attendance stays on the clock-in work date. The first480 completed minutes per employee/date are regular; later minutes are overtime across all sessions.
- Employee/admin previews, persisted allocations and payroll use the same daily rules. Corrections update affected siblings atomically. Legacy duplicates are reported rather than silently deleted; their visible active-session selection matches server ordering.
- Financial results remain frozen after finalisation. Current identity/bank details continue appearing on documents, as requested.
- Canonical reset restores business fixtures, custom adjustments and dependent records safely while preserving users/sessions and unrelated companies. Manual and scheduled reset honor demo restrictions.

### Finding status and fixing commits

| Finding | Current status | Repair / verification |
| --- | --- | --- |
| WF-001 | **Resolved locally** | `9e0c731`: all four resource loaders enforce company ownership; employee ownership retained. Two-company download tests and original foreign-resource reproduction pass. |
| WF-002 | **Resolved locally** | `3a93e93`, `8397eeb`: conditional clock-in allows only one active shift; concurrent HTTP reproduction now inserts exactly one. Legacy active selection is deterministic. |
| WF-003 | **Resolved locally** | `3a93e93`, `8397eeb`: cross-midnight lookup, exact24h boundary, older nonblocking reminders. Month/year/leap-day handler journeys and UI tests pass. |
| WF-004 | **Resolved locally** | `3a93e93`, `8397eeb`: daily allocator, transactional sibling reallocation, migration, employee/admin previews and payroll aggregation. Split600m =>480 regular/120OT. |
| WF-005 | **Resolved locally** | `daed19f`, `8397eeb`: shared web/PDF items include bonus, unpaid leave and other deductions; original payslip scenario now reconciles. |
| WF-006 | **Resolved locally** | `782b736`: canonical fixture reset restores payroll adjustments and all mutable baseline business rows. Custom adjustment count returns to0; repeated resets preserve auth and other companies. |
| WF-007 | **Resolved locally** | `782b736`, `253652c`, `8397eeb`: canonical date validation in leave, holiday and employee paths; impossible-date HTTP reproduction no longer persists a request. |
| WF-008 | **Resolved locally** | `782b736`, `60a1b38`, `94deaa3`, `8397eeb`: shared server schema, atomic profile saves, accessible field errors and retained values; leading-zero accounts preserved. |
| WF-009 | **Resolved locally** | `3a93e93`, `8397eeb`: explicit Malaysia departure field and validated capture, safe default for later starts, overlap/ownership guards. Invalid/future departures return controlled errors. |
| WF-010 | **Resolved locally** | `3a93e93`: equal/reversed/invalid ordering returns validation feedback without changing the source shift. Original same-instant reproduction passes. |
| WF-011 | **Resolved locally** | `8397eeb`: contrast fixes and enabled checks. Attendance axe checks pass at all four sizes; admin smoke includes contrast. |
| WF-012 | **Resolved locally** | `daed19f`: measured pagination and totals placement. All0/1/22/23/30/100 employee codes retained exactly once;30 rows produce2 pages and100 produce5. |
| WF-013 | **Resolved locally** | `daed19f`: licensed local Noto/fontkit rendering. Latin, Chinese and Tamil fixtures and an actual Worker-generated Unicode payslip were text/visually checked. |

### Related concerns

- **C-01 addressed:** `5c9bd9f`, `60a1b38`, `253652c`, `8397eeb` enforce role/company/state in conditional administrative writes, with atomic audit/notification gating. Finalisation guards employee, attendance, adjustment, unpaid-leave and holiday inputs (`9e0c731`, `203c51b`); interposed-edit races reject without financial outputs. Leave insertion also guards the calendar snapshot against a concurrent holiday change.
- **C-02 policy confirmed and verified:** documents intentionally use current employee details. A Unicode name and synthetic leading-zero bank account appeared in a real local Worker PDF/bank export, while the finalised input snapshot, breakdown and totals remained byte-for-byte unchanged.
- **C-03 addressed:** greetings use Malaysia time, with noon and18:00 boundaries covered by tests.
- **C-04 investigated, not reproduced:** the generic `Response` error did not recur in local four-size logout/redirect/stale-tab regression journeys or an authentication-only recheck of the unchanged deployment at1440/768/390/360px. No arbitrary errors were suppressed. Retain the initial observation if it recurs after release; its original cause remains unconfirmed.

### Final execution evidence

| Verification | Result | Evidence |
| --- | --- | --- |
| Typecheck + unit/integration + production build + Worker dry-run | **Pass:**303 tests,35 files; no deployment | [Release check](../../output/playwright/remediation-2026-10-13/check-release.log) |
| ESLint | **Pass:** no errors/warnings | [Lint](../../output/playwright/remediation-2026-10-13/lint-release.log) |
| Complete Chromium browser suite | **Pass:**61 tests;39 intentional skips | [Browser run](../../output/playwright/remediation-2026-10-13/e2e-release.log) |
| Original server/D1 audit reproductions | **Pass:**17/17 | [Results](../../output/playwright/remediation-2026-10-13/original-server-retests.json) |
| Browser usage rerun | **Pass:**30 cycles,44 total assertions, no page errors | [Results](../../output/playwright/remediation-2026-10-13/local-results.json) |
| Supplemental payroll/profile/reset checks | **Pass:**12 checks, including live profile/frozen money | [Results](../../output/playwright/remediation-2026-10-13/supplement-results.json) |
| HTTP edge reproductions | **Pass:**4/4 | [Results](../../output/playwright/remediation-2026-10-13/edge-results.json) |
| Deterministic workdays + migration rehearsal | **Pass:**30 workdays; boundary cases, source records and finalised results preserved | [Full regression run](../../output/playwright/remediation-2026-10-13/check-release.log), [migration retest](../../output/playwright/remediation-2026-10-13/preview-migration-green.log) |
| PDF content/rendering | **Pass:**all expected employee rows; complete items and Unicode visible | [PDF review](../../output/playwright/remediation-2026-10-13/pdf-qa/extraction-review.json), [Worker PDF](../../output/playwright/remediation-2026-10-13/current-profile-unicode-payslip.png) |
| Fresh independent source review | Two Important findings repaired with failing-then-passing regressions | [Review record](../../output/playwright/remediation-2026-10-13/review.md) |

The first migration test compared D1 metadata (duration/last-row-ID) instead of stored result rows and was corrected. Later migration verification and the final full suite pass. Preliminary host-overload and browser-selector failures are retained with explanations, rather than counted as product defects. A cold Vite import error occurred during one all-assertions-passing usage run; the warmed rerun and final suites were clean. [Evidence guide and rerun instructions](../../output/playwright/remediation-2026-10-13/README.md).

### Release instructions and remaining limits

1. Apply the new0006 migration before deploying this candidate. Seven sequential migrations validate. No previously applied migration was edited.
2. Before a live release, inspect the live company's attendance for overlapping/duplicate legacy sessions and rehearse against a disposable copy of that live data. The completed rehearsal used synthetic duplicate/split-shift data and verified no attendance deletion or finalised-result changes. Live D1 was not migrated or altered in this task.
3. Backfill changes to derived overtime/updated-at can make an existing pending correction stale. Keep the optimistic guard and have affected employees submit refreshed requests; do not silently approve stale values.
4. Deploy through the existing gated pipeline, then confirm `/healthz`, which now requires0006, and repeat live employee/admin handoffs. This deployment step remains outside the authorised implementation scope.
5. The original audit's hardware/GPS, statutory certification, browser-engine and sustained-load limitations remain. Current evidence covers Chromium at four viewport sizes and bounded repeated usage.

Original failure evidence remains in `output/playwright/audit-2026-10-13/`. Current verification is in `output/playwright/remediation-2026-10-13/`; the original checkout's source and untracked scratch data were preserved.
