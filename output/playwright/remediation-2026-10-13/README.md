# Workforce One remediation verification

Source branch: `codex/audit-remediation`. Original audit evidence remains separately preserved in `../audit-2026-10-13/`.

## Evidence

- `check-release.log`: final typecheck, unit/integration tests, production build and Worker deploy **dry-run**. No deployment occurred.
- `lint-release.log`: final ESLint output.
- `e2e-release.log`: final four-viewport browser run; intentional skips remain visible.
- `original-server-retests.json`/`.log`: all 17 original server/D1 reproductions pass; timestamp-driven tests with only the output path adapted for isolated execution.
- `local-results.json`/`local-rerun.log`: all 30 individual login/navigation/attendance/logout cycles pass, no extra records, no remaining current-day open shifts, no browser errors. Other profile/auth/leave/recovery checks pass too.
- `supplement-results.json`: complete payslip itemisation, repeat-safe payroll, matching CSV totals, current Unicode identity/bank details and unchanged finalised financial snapshots; demo reset clears custom adjustments.
- `edge-results.json`: duplicate clock-in creates one active row; impossible leave dates are rejected; cutoff/rejection checks pass.
- `current-profile-unicode-payslip.pdf`/`.png`, `worker-pdf-review.json`: actual local Worker document generated through ASSETS/fontkit, visually reviewed and text checked. Identity/bank values were synthetic audit replacements.
- `pdf-qa/`: synthetic 0,1,22,23,30,100 employee reports plus wrapped/Unicode fixtures. Every expected AUDIT employee code appears once;23+ employees paginate.
- `auth-live-diagnostic.json`: authentication-only recheck of the original deployment across four sizes. No business records changed. Generic `Response` error did not recur.
- `review.md`: fresh independent source review and repaired Important findings.

## Retained failures and retests

- `*-red.log` captures regression failures before implementation; `*-green.log` captures their focused fixes.
- `e2e-initial.log` has four harness failures: hidden sign-out selectors at responsive sizes, and a strict global status selector during a transient navigation announcement. Selectors were corrected and full browser runs repeated.
- `unit-final.log` preserves an overloaded preliminary run. Concurrent workerd/Chromium verification caused timeouts and cascading fixture shutdown errors. Vitest now bounds workers to2; final verification ran sequentially and passed without increasing test timeouts globally.
- `check-initial-type-failure.log` preserves a test-only route-argument cast error, corrected before the release check.
- `local-results-cold-start.json` preserves a cold Vite dependency-import error despite all 44 assertions passing. Warm-start rerun completed all 30 cycles and other assertions without any page error. Production build and the independently warmed full browser suite also pass. This was not classified as the earlier generic live `Response` error.

## Rerun

Use Node24 or newer. Work only on disposable/local D1 data; these browser scripts reset business data.

```sh
npm ci
npm run db:migrate:local
npm run db:seed:local
npm run db:migrations:validate
npm run check
npm run lint
npm run test:e2e
```

For the audit browser scripts, first start the isolated dev server on5173, then run sequentially from this worktree:

```sh
node output/playwright/remediation-2026-10-13/local-audit.mjs
node output/playwright/remediation-2026-10-13/supplement-audit.mjs
node output/playwright/remediation-2026-10-13/edge-audit.mjs
```

Update their explicit SQLite path if using another checkout. The scripts open SQLite **read-only** and mutate only through authenticated application actions. Copy `original-server-retests.test.ts` into `app/audit-original-retests.test.ts` to rerun it with Vitest, then remove that temporary copy; the canonical regression suites are already in the app/tests tree.

Do not rerun against the shared deployment. Only `auth-live-diagnostic.mjs` intentionally targets the live host and limits itself to authentication/navigation.

After local simulations, run `npm run db:seed:local` to restore the baseline, and stop the temporary dev server. Reruns replace output filenames; archive existing evidence first.

Logs were explicitly versioned despite the default `*.log` ignore rule. Raw command output whitespace is preserved as evidence.
