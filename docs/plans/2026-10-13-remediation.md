# Approved audit remediation execution ledger

Source: user-approved complete remediation plan in this chat; initial audit is docs/audits/2026-10-13-workflow-audit.md.

## Contract

Resolve WF-001 through WF-013 and C-01 through C-04. Active shifts last at most24h including midnight. Older gaps prompt correction without blocking work. Daily first 480 completed minutes regular; remaining overtime, attributed to clock-in work date. Current employee identities remain live on documents; finalised financial results remain immutable. No deployment.

## Tasks

- [x] Company-scoped document loaders and payroll stale-input guards (security).
- [x] Atomic attendance lifecycle, daily allocation, correction integration and migration (root).
- [x] Calendar/profile validation and canonical demo reset (validation_reset).
- [x] Complete PDF/web line items, pagination and Unicode fonts (documents).
- [x] Portal mutation guards, field feedback, greeting and contrast (root).
- [x] Full verification, 30cycles/30days, audit update and review.

## Rulings

- Worktree authorised by approved isolated-branch plan. Original untracked audit/evidence copied for preservation; original checkout remains unchanged.
- Parallel independent work follows dispatching-parallel-agents skill; portal integrations have one owner to avoid conflicting edits.

## Completion evidence

Candidate source commit8397eeb; final303 unit/integration tests pass,61 browser tests pass and39 intentional viewport/shared-state skips remain. All17 original server reproductions pass;30 browser cycles and30 simulated workdays pass. Migration rehearsal, typecheck, lint, production build and Worker dry-run pass. Fresh review's two Important findings were repaired and regression-tested. No merge, push or deployment.

## Additional rulings

- Old gaps prompt without blocking new work, per explicit user choice; administrator capture still resolves oldest historical gap for seeded demonstration.
- Finalised amounts stay frozen; employee identity/bank fields stay current, per explicit user choice.
- Daily allocation migration may make pending corrections stale when derived values change; existing optimistic guards deliberately require refreshed requests.
- Bounded Vitest workers to2 after concurrent workerd/browser runs caused false timeouts; final verification ran sequentially without globally extending test timeouts.
- Generic live Response error not reproduced in four live sizes or local regression journeys; observation retained, not suppressed or falsely classified as fixed.
