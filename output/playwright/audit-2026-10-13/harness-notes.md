# Harness notes and retests

These are not product defects.

1. Initial E2E warm-up could not hydrate because the dependency symlink pointed outside the temporary Vite allow-list. Vite rejected the real `node_modules/@react-router/dev/dist/config/defaults/entry.client.tsx` path. Warm-up ended with `The development client did not hydrate after three attempts.` The underlying error remains in `local-server.log`; the E2E summary was replaced by the successful rerun. Only temporary harness configuration changed. Rerun: 49 passed, 39 intentionally skipped.
2. Initial cross-origin assertion expected exactly 403; React Router rejects these form POSTs with 400. Supplemental retest verified a valid 4xx denial and unchanged profile: Pass.
3. Initial employee/admin-approval check called `.status()` on a plain harness response object. Supplemental retest checked leave status before/after: unchanged, Pass. The role redirect followed to employee HTML (200), so state verification was required.
4. Source scripts were corrected; original local-results/logs remain unchanged. The supplemental optional observation initially looked for nonexistent `manualDeductionSen`; corrected source and the synthetic fixture use `otherDeductionSen`. Submitted RM25 adjustment, screenshot and totals independently prove the missing line.
5. A generic live `Response` page error had no established visible failure/root cause. Retained as an unconfirmed observation, not a counted defect.
6. Server/PDF reproduction suites intentionally have nonzero exit codes while defects remain. Application behavior was not changed to make assertions pass.
7. Test hooks and the Vite allow-list adjustment exist only in the disposable copy. Original source and existing untracked scratch content were preserved. No worktree, deployment, or product implementation was required for this audit.
