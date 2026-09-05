# Workforce One HRMS Demo

A responsive Malaysian HR, attendance, leave and payroll demonstration for **Merdeka Coffee Sdn. Bhd.** It runs as a React Router 8 SSR application on Cloudflare Workers with D1, and uses real mutable demo records rather than hard-coded dashboard totals.

## Demo accounts

| View | Email | Password |
| --- | --- | --- |
| Admin | `admin@workforceone.demo` | `AdminDemo#2026` |
| Employee (Farah) | `employee@workforceone.demo` | `EmployeeDemo#2026` |

For a complete role-by-role walkthrough and presentation script, see the [Workforce One presenter guide](docs/workforce-one-presenter-guide.md).

The login page can autofill either account. The shared dataset resets nightly at 19:00 UTC (03:00 MYT) and can be reset by an admin from the dashboard guide. Authentication records and active sessions are preserved by the domain reset.

## Local setup

Node.js 24 or newer is required by React Router 8.

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

Open `http://127.0.0.1:5173`. Local D1 data is stored by Wrangler and has the same SQLite behavior used by the deployed Worker.

Useful commands:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
npx playwright test
npm run check
```

## Functional walkthrough

1. Sign in as Admin and open Attendance capture.
2. Complete the missing clock-outs for Farah and Alex using fingerprint or QR.
3. Approve Sarah’s leave request; balances, audit data and the action queue update together.
4. Open August payroll. The run cannot be finalised while attendance exceptions remain.
5. Finalise the run to freeze employee inputs and policy breakdowns and create payslips.
6. Export the protected payroll PDF/CSV, then switch to Farah’s employee account to view the new notification and protected payslip PDF.

## Attendance corrections

Employees can request a correction from Attendance history, compare original and proposed times in Malaysia time, and preview worked/overtime minutes before submitting a reason. Attendance changes only after approval. Request history includes pending, approved, and rejected decisions with rejection reasons.

Admins review requests at `/admin/attendance/corrections`, linked from Attendance, the dashboard, notifications, and payroll blockers. Pending requests and missing clock-outs block only the matching company/payroll period. Approvals after finalisation update attendance while leaving payroll results, snapshots, payslips, and exports unchanged.

The workflow uses migration `0005_attendance_corrections.sql`. Apply migrations before starting the updated app. The nightly/manual demo reset restores corrected source records and clears correction history. Employee “Reset today” cannot delete records linked to a correction.

Database integration tests run against disposable Miniflare D1 instances; they do not use the local development database. The Playwright acceptance journeys use the local demo and reset it afterward.

## Data and security model

- Money is stored as integer sen; time as integer minutes; timestamps as ISO UTC and displayed in `Asia/Kuala_Lumpur`.
- Passwords use PBKDF2-SHA-256 with 100,000 iterations. Opaque session tokens are SHA-256 hashed in D1 and delivered in HttpOnly, SameSite cookies.
- Writes enforce same-origin checks. Login attempts are rate-limited. Admin/employee roles and payslip ownership are checked in loaders, actions and document resources.
- Finalised payroll results contain immutable input and calculation snapshots. The finalisation key and D1 uniqueness constraints make repeat submissions safe.
- Generated documents are returned from protected Worker routes and are never stored publicly.
- `GET /healthz` reports migration and schema readiness without exposing application data.

## Malaysian payroll scope

The bundled policy is **Malaysia Standard — 2026**, for Malaysian employees under 60. It models monthly and hourly wages, 1.5× overtime, unpaid leave, allowances, bonuses, manual deductions, EPF, SOCSO, EIS, externally verified PCB, employer contributions and net pay.

Statutory fixtures were reviewed on 26 August 2026 against:

- [KWSP mandatory contribution schedule](https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution), effective October 2025
- [KWSP liable and non-liable payments](https://www.kwsp.gov.my/en/employer/introduction)
- [PERKESO contribution rules](https://perkeso.gov.my/en/our-services/employer-employee/contributions), including the RM6,000 ceiling
- [LHDN PCB payment methods](https://www.hasil.gov.my/majikan/pembayaran-pcb/)
- [Employment Act 1955](https://jtksm.mohr.gov.my/sites/default/files/2023-11/Akta%20Kerja%201955%20%28Akta%20265%29.pdf)

This is a product demo, not statutory certification. It does not implement full computerized PCB/YTD tax calculation or foreign-worker, age-60+, SKBBK, HRDF, banking or government-submission profiles.

## Cloudflare deployment

`wrangler.jsonc` is the source of truth for the production Worker and its D1 binding. The configured database ID points to `workforce-one-demo`. Creating a D1 database in the Cloudflare dashboard or with `wrangler d1 create` produces the same resource; the binding's database ID determines which database the Worker uses.

Database structure is changed only through numbered files in `drizzle/migrations`. Never run schema-changing SQL directly in the dashboard or a deploy workflow. Never edit an already-applied migration; add the next migration and commit its Drizzle journal/snapshot updates. Validate the chain locally with:

```bash
npm run db:migrations:validate
npm run check
```

Every pull request and push runs typechecking, lint, unit/integration tests, a production build, a Wrangler dry-run, and desktop/mobile browser journeys against a fresh local D1 database. A push to `main` deploys only after both verification jobs pass. The same workflow then:

1. applies pending D1 migrations and stops on any error;
2. deploys the exact tested commit;
3. calls the deployed `/healthz` endpoint to confirm the Worker and required schema are live; and
4. serializes production releases so two pushes cannot migrate/deploy concurrently.

The production seed is intentionally never run during deployment because it resets business data. Use `npm run db:seed:local` only for local development. The nightly demo reset remains controlled by the configured Worker cron.

GitHub Actions requires repository secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Create a narrowly scoped Cloudflare token that can deploy this Worker and edit its D1 database, then add the secrets in GitHub repository settings. You can also set them from an authenticated terminal without putting their values in shell history:

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

The workflow can be rerun from GitHub Actions with **Run workflow** after repairing credentials; no empty commit is needed. If a migration fails, inspect and reconcile the remote schema and `d1_migrations` ledger before rerunning. Do not bypass a failure with raw `ALTER TABLE` statements or `|| true`.
