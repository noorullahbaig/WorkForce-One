# Audit evidence and rerun instructions

Main record: [Workflow audit](../../../docs/audits/2026-10-13-workflow-audit.md).

## Evidence map

- `environment.json`, `live-health.json`: source/environment and final live health snapshot.
- `unit-tests.log`: existing 125-test suite.
- `e2e-tests.log`: existing browser suite, 49 passed/39 skipped.
- `live-results.json`, `live-accessibility.json`, `live-*.png`: deployment behavior and responsive/accessibility evidence.
- `local-results.json`: 30 individual usage cycles and additional local workflows. The outer cycle assertion verifies row count and no current-day active shifts.
- `supplement-results.json`: payroll totals, ownership, recovery, reset, and corrected harness checks.
- `edge-results.json`: duplicate clock-in and impossible-date HTTP reproductions, backdate/rejection boundaries.
- `server-simulations.json`/`.log`: deterministic D1/handler/time tests, including foreign-company exports. Entries without `status` are observations belonging to adjacent assertion entries.
- `pdf-simulations.log`, `pdf-content-review.json`, `synthetic-*.pdf`/`.png`: document failures and visual/text review. PDF names/amounts are synthetic.
- `local-server.log`: isolated Worker logs, including the initial dependency-resolution error.
- `harness-notes.md`: environmental and harness failures separated from product defects.

Log files are ignored by the existing `*.log` Git rule but are present locally. Preserve this evidence directory alongside the audit if archiving it. No commit/push was performed.

## Reproduction environment

Use a fresh disposable copy with separate `.wrangler` state. Never point mutation scripts or the E2E suite at the shared deployment. Required: Node >=24, repository dependencies, Playwright Chromium.

The original sandbox was `/tmp/workforce-audit-2026-10-13`; only `node_modules` was shared by symlink. Its temporary Vite config allowed that dependency location. A physical dependency copy or isolated install avoids the allow-list adjustment.

From the sandbox:

```sh
npm run db:migrate:local
npm run db:seed:local
npm run dev -- --host 127.0.0.1 --port 5173 --force
```

Run existing tests in another terminal from the sandbox:

```sh
npm run test:run
npm run test:e2e
```

Copy `server-simulations.test.ts` to `<sandbox>/app/audit.simulation.test.ts` and `pdf-simulations.test.ts` to `<sandbox>/app/audit.pdf.test.ts`. Their relative imports require this location. Update output constants if moving the repository, then:

```sh
npx vitest run app/audit.simulation.test.ts
npx vitest run app/audit.pdf.test.ts
```

Assertions intentionally **fail while defects remain**. Server tests create/dispose independent Miniflare D1 state. PDF tests use synthetic rows. These are known-failure audit reproductions, not new normal-CI tests.

## Browser simulations

From the original repository root, with Node 24 and the sandbox server running:

```sh
node output/playwright/audit-2026-10-13/live-audit.mjs
node output/playwright/audit-2026-10-13/local-audit.mjs
node output/playwright/audit-2026-10-13/supplement-audit.mjs
node output/playwright/audit-2026-10-13/edge-audit.mjs
```

The live script authenticates/navigates/logs out without business changes. Local scripts target `127.0.0.1:5173` and inspect disposable SQLite through a read-only connection. Update their explicit SQLite path if changing the sandbox. They combine real browser form journeys with authenticated HTTP requests for validation/concurrency.

Run sequentially after E2E; local browser scripts share disposable state. Finish with `npm run db:seed:local` in the sandbox for a complete baseline. Admin reset alone is insufficient because WF-006 retains custom adjustments. Never seed production.

Original reports preserve first-run evidence; corrected scripts and supplemental results document retests. Reruns overwrite the same output files: archive this directory or choose another output path first.
