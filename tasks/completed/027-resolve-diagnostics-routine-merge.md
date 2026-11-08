# 027 — Resolve diagnostics and routine-sync merge

id: 027
updated: 2026-11-07

## Goal

Resolve the in-progress merge of main and incoming routine work, preserve safe
account diagnostics and protocol v1/v2 routine behavior, reconcile the duplicate
task ID with owner approval, validate locally, then commit and push the merge.

## Out of scope

- New product features, UI redesign, dependencies or configuration changes.
- Editing generated migrations, applying migrations, Neon/OAuth/production probes or manual device acceptance.
- Force-push, history rewrites, bypassing checks/protections or discarding either branch's work.

## Next step

No remaining merge-resolution step. The reviewed merge is committed and pushed
to origin/main; task 024 remains in backlog awaiting owner device acceptance.
Migration 0005 rollout and production incident verification are separate,
explicitly authorized operations, not inferred from the push.

## Checklist

- [x] Inspect index/staged work and both conflict sides; preserve incoming feature files.
- [x] Reassign diagnostics from branch-local 023 to 026 with owner approval; update references, park 024 and register this task.
- [x] Resolve route/repository conflicts preserving diagnostics and both sync versions, including routine data.
- [x] Add regression coverage for v2 reads/writes, error correlation and routine SQL failure stages.
- [x] Run tests, types, lint, formatting, migration journal/task guard and isolated build/public E2E.
- [x] Review staged diff, no conflict markers/secrets, then commit and push the merge without force.
- [x] Record validation/results, complete task/board and run the guard.

## Files

- `app/api/account/data/route.ts` — version negotiation with diagnostic boundaries.
- `lib/sync/server-repository.ts` — v2 routines, validation and instrumented reads.
- `lib/observability/account-diagnostics.ts` — typed failure stages.
- `tests/account-data-route.test.ts`, `tests/account-diagnostics-postgres.test.ts` — merge regressions.
- `tasks/README.md`, `tasks/completed/026-account-failure-diagnostics.md`, `tasks/backlog/024-sequential-routines.md` — reconciled task state.
- `docs/cloud/2026-11-07-account-diagnostics.md` — updated task link and routine-stage documentation.

## Decisions

- 2026-11-07 — Owner explicitly authorizes fixing the merge, renumbering diagnostics to 026, committing and pushing. The already in-progress merge is on main tracking origin/main; use a normal merge commit/push, not a rebase or force-push. This is the owner-approved exception to reference branch/ID defaults.
- 2026-11-07 — Preserve all incoming staged routine/task-moment/pending-editor changes and generated migration 0005 verbatim. No remote database changes are authorized.
- 2026-11-07 — 024 remains awaiting actual-device acceptance, now parked in backlog. The diagnostics task stays completed; this new integration task holds merge validation and publication evidence.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-07 | Initial merge inspection | Passed | Three unmerged paths: account data route, server repository, task board. HEAD 8347c44; incoming 9de6102. Other staged feature work preserved. |
| 2026-11-07 | Task registration/ID reconciliation | Passed | 24 task files, 0 errors/warnings. 023 unified moments retained; diagnostics renamed 026; 024 parked for actual-device acceptance. |
| 2026-11-07 | Focused merge regression tests | Passed | 90/90 across route, diagnostic unit/PGlite and real persistence suites. Includes v1/v2 negotiation, writes, conditional reads, error IDs and actual v2 routine SQL failures. |
| 2026-11-07 | Working diff whitespace | Passed | `git diff --check` clean after conflict edits. |
| 2026-11-07 | Full isolated `npm test` | Passed | 550/550 tests in 54 files in `/tmp/avo-merge-check-9aR6k3`. |
| 2026-11-07 | Isolated types, lint, format, journal and task guard | Passed | `typecheck`, `lint`, `format:check`, `db:check`, `check:tasks`; 24 tasks, 0 errors/warnings. |
| 2026-11-07 | Isolated production build | Passed | Next 16.4.3, Cache Components/PPR retained, service worker generated. Synthetic loopback environment only; no private env files copied. |
| 2026-11-07 | Public Chromium E2E after build | Passed | 31/31 including routine, pending-edit, task-moment and accessibility journeys. Loopback DB was intentionally absent: session probes emitted actual ECONNREFUSED diagnostics; no Neon/OAuth/account/device coverage claimed. |
| 2026-11-07 | Resolved index/staged review | Passed | No unmerged paths, staged whitespace clean, no private env/key/build-output paths. Compared resolved route/repository to incoming to verify diagnostic-only additions preserve routine behavior. |
| 2026-11-07 | Generated migration/lock preservation and secret-pattern scan | Passed | `git diff --quiet MERGE_HEAD -- drizzle package-lock.json` clean. Staged high-confidence private-key/GitHub/AWS/Slack-pattern scan found no matches; not a comprehensive security audit. |
| 2026-11-07 | Merge commit and normal push | Passed | Merge commit `e26ec88` pushed from main to origin/main (`9de6102..e26ec88`); tracking status clean. No force/history rewrite. Remote reported repository moved to Hangtu/avo but accepted the push through existing origin; no remote configuration changed. |
| 2026-11-07 | Closure task guard/whitespace | Passed | Task moved to completed, focus cleared, 024 stays parked; 24 tasks, 0 errors/warnings; whitespace clean. |
| 2026-11-07 | Remote CI/deployment/Neon/OAuth/device acceptance | Not run | Push is evidence of publication only. No production schema changes, remote checks or device acceptance were performed. |

## Log

- 2026-11-07 — Owner resolved the task-ID-policy blocker and authorized commit/push. Saved integration plan before application edits; read installed Next route-handler/rethrow guidance and task state.
- 2026-11-07 — Resolved code conflicts by combining versioned routine persistence with request-local diagnostics; preserved incoming routine membership/quarantine logic. Added account.routines stage and six merge-regression cases; focused 90 tests pass. Incoming generated migration 0005 remains unchanged/unapplied; database rollout is not authorized by commit/push.
- 2026-11-07 — Full isolated validation passed (550 unit/integration, 31 public Chromium journeys, types/lint/format/journal/guard/build). Staged merge review confirms no unmerged paths and no generated migration edits beyond incoming. Commit/push were the next authorized operation; no external acceptance or deployment claim.
- 2026-11-07 — Created and successfully pushed merge `e26ec88`; index/worktree clean and origin/main tracking aligned. Closing this integration task in a documentation checkpoint; task 024's device acceptance and any remote migration remain open. The accepted repository-moved notice is informational and requires no merge fix.
