# Workforce One HRMS Demo

A responsive Malaysian HR, attendance, leave and payroll demonstration for **Merdeka Coffee Sdn. Bhd.** It runs as a React Router 8 SSR application on Cloudflare Workers with D1, and uses real mutable demo records rather than hard-coded dashboard totals.

## Demo accounts

| View | Email | Password |
| --- | --- | --- |
| Admin | `admin@workforceone.demo` | `AdminDemo#2026` |
| Employee (Farah) | `employee@workforceone.demo` | `EmployeeDemo#2026` |

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

1. Sign in as Admin and open the Attendance simulator.
2. Complete the missing clock-outs for Farah and Alex using fingerprint or QR.
3. Approve Sarah’s leave request; balances, audit data and the action queue update together.
4. Open August payroll. The run cannot be finalised while attendance exceptions remain.
5. Finalise the run to freeze employee inputs and policy breakdowns and create payslips.
6. Export the protected payroll PDF/CSV, then switch to Farah’s employee account to view the new notification and protected payslip PDF.

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

Create separate staging and production D1 databases, replace the placeholder database ID in `wrangler.jsonc`, then apply migrations and seed each environment:

```bash
npx wrangler login
npx wrangler d1 create workforce-one-demo-staging
npx wrangler d1 migrations apply workforce-one-demo-staging --remote
npx wrangler d1 execute workforce-one-demo-staging --remote --file=./drizzle/seed.sql
npx wrangler deploy --env staging
```

Repeat with the production database and environment after acceptance. Observability logs/traces and the nightly cron trigger are configured in `wrangler.jsonc`.

Production deploys apply pending migrations only. The demo seed is intentionally not run during deployment because it resets the database; use it only for a disposable local or staging environment.

The GitHub `Deploy` workflow requires repository secrets named `CLOUDFLARE_API_TOKEN` (with Workers and D1 permissions) and `CLOUDFLARE_ACCOUNT_ID`. Add them with `gh secret set` or in the repository settings before merging to `main`.
