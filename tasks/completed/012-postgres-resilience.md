# 012 — PostgreSQL resilience and sync efficiency

id: 012
updated: 2026-11-04

## Goal

Implement the owner-approved PostgreSQL review: safe pool error handling,
PgBouncer-compatible SQL/lock budgets, no counter updates after denial, bounded
less-frequent cleanup, direct-only migration guards, consistent bootstrap
snapshots, conditional reads without full payloads, Retry-After and foreground
network scheduling. Prove behavior locally without touching Neon or OAuth.

## Out of scope

- Neon Auth, identity/linking changes, new providers, dependencies or services.
- Remote operations, application/shared-schema migration, historical token cleanup, deploy,
  commits, staging/unstaging or rewriting the already staged task 011 changes.
- Installing/starting PostgreSQL or containers without separate approval; no
  real .env reads/writes, no connection inferred from application credentials.

## Next step

Local scope is complete. Remaining release gates need separate authorization:
application migration 0004 with confirmed destination/recovery, then real
OAuth/device acceptance and deployment. The disposable PostgreSQL fixture is
removed. E4.2 stays in backlog; no next task starts automatically.

## Checklist

### Baseline and boundaries

- [x] Preserve the staged diff/index fingerprint and record synthetic baseline.
- [x] Keep existing ORM/driver and local-space names; read installed API guidance.

### Approved review findings

- [x] P1: install one sanitized idle-pool error listener, including HMR reuse;
  test asynchronous errors and duplicate initialization.
- [x] P2: use transaction-local statement/lock budgets for limiter, repository
  and auth DB operations, with safe rollback/release and no session SET leakage.
- [x] P2: deny saturated counters without UPDATE; reduce bounded cleanup
  frequency, preserve atomic consumption, safe expiry pruning and fail closed.
- [x] P2: share direct-URL validation across local/prod/CI migration entry points;
  generation/check remain credential-free; never fall back to pooled or defaults.
- [x] P2: bootstrap uses REPEATABLE READ and bounded retries for lazy owner/
  serialization races, without locking warm reads behind mutations.
- [x] Conditional reads: derive an account-scoped ETag from existing counts and
  revision sums inside the same RR snapshot; authorized 304 avoids downloading/
  hashing full domain payloads. No new schema or token-invalidation maintenance.
- [x] Preserve/parse bounded Retry-After, queue idempotency, schedule retries no
  earlier than allowed; pause network polling while hidden/offline and resume.

### Verification and completion

- [x] Add an explicit opt-in multi-connection PostgreSQL suite with a fail-closed
  loopback/disposable-target guard; test quota, reset/cleanup races, budgets and
  snapshot interleaving; do not silently skip it as if it passed.
- [x] Execute the real suite only against an approved disposable local target.
- [x] Run focused/full tests, types, lint, format, migration-journal/task/dependency
  guards, isolated build and public E2E; preserve staged files and private env.
- [x] Review the diff, document decisions/evidence/limits, checkpoint and run guard.

## Files

- `lib/db/client.ts` — pool lifecycle and runtime database access.
- `lib/auth.ts` — existing Better Auth persistence integration.
- `lib/security/rate-limit-store.ts` — atomic counters and pruning.
- `lib/sync/server-repository.ts` — consistent account reads/writes.
- `lib/sync/client.ts` — throttling response handling and outbox.
- `components/account-workspace.tsx` — client sync wakes and polling.
- `drizzle.config.ts` — credential-free tooling config and current migration path.
- `drizzle.prod.config.ts` — current production direct-connection guard.
- `.github/workflows/production-migrations.yml` — reviewed CI migration entry.
- `lib/db/transaction.ts` — SQL budgets and aborted-transaction retries.
- `lib/db/auth-adapter.ts` — bounded Better Auth persistence without request-wide transactions.
- `lib/sync/server-version.ts` — narrow revision aggregates for private conditional reads.
- `tests/postgres/concurrency.postgres.ts` — six real-session cases waiting for execution.
- `tests/postgres/target.ts` — fail-closed, explicit local-target guard.
- `vitest.postgres.config.mts` — isolated opt-in suite, not part of npm test.
- `docs/cloud/2026-11-04-postgres-resilience.md` — decisions and safe test procedure.

## Decisions

- 2026-11-04 — Owner approved the five findings and three additional improvements;
  this is implementation permission, not authorization to migrate or access Neon.
- 2026-11-04 — Task 011 is staged by the owner; preserve that index and layer
  this task as unstaged changes. E4.2 remains in backlog.
- 2026-11-04 — Docker context is a local OrbStack socket, but daemon is unavailable;
  no postgres/psql/initdb on PATH. Requested permission; do not start/install it.
- 2026-11-04 — Avoid role/server changes and pooled session SET. Use bounded
  transactions at DB boundaries; no external OAuth calls inside DB transactions.
- 2026-11-04 — Owner replied "adelante" to starting OrbStack, downloading the
  official PostgreSQL image if absent and running a disposable loopback-only
  avo_test_resilience database. This authorizes only local test fixtures, not
  application/Neon migration, existing data, OAuth, commit or deploy.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-04 | Working tree/index inspection | Passed | Existing 39-file task 011 diff is staged; no unstaged edits before this task |
| 2026-11-04 | Baseline npm test | Passed | 440/440 in isolated copy; synthetic environment, existing dependencies |
| 2026-11-04 | Progress tests/types | Passed after test corrections | 464/464; first failures were raw execute typed unknown and PGlite transaction logging assumptions |
| 2026-11-04 | Real local PostgreSQL availability | Initially blocked, resolved | Owner approved disposable container; OrbStack became available; official PostgreSQL 17.11 used |
| 2026-11-04 | npm run verify | Passed | 472/472 in 49 files, dependency policy/tests, format, lint, types, journal and task guard; isolated synthetic copy |
| 2026-11-04 | npm run test:tasks | Passed | 41/41 guard tests |
| 2026-11-04 | npm run build | Passed | Synthetic loopback env; public pages static; Cache Components/Partial Prefetching retained |
| 2026-11-04 | npm run test:e2e | Passed | 10/10 public Chromium journeys; no authenticated account/device coverage |
| 2026-11-04 | Real-suite typecheck / collection | Passed | Six cases collected separately from the 472 synthetic/PGlite cases; actual execution result below |
| 2026-11-04 | Real-session quota/lock/cancellation/snapshot proof | Passed | 6/6 on official PostgreSQL 17.11 arm64; four distinct backend PIDs asserted; 40 concurrent quota calls, 20 reset calls, actual 57014/55P03, MVCC tuple unchanged on denials, interleaved RR snapshot and lazy-owner race |
| 2026-11-04 | Approved local target / image | Passed | Fresh avo_test_resilience, role avo_test, 127.0.0.1:65432, zero initial user tables; postgres:17-alpine resolved to sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b |
| 2026-11-04 | Fixture teardown | Passed | Exact container ID/image, nonce labels, loopback binding and tmpfs/no-bind-mount ownership verified before stop/remove; disposable credential removed; 12 other containers left running |
| 2026-11-04 | git diff --check / cached diff check | Passed | No whitespace errors; index changes from outside this agent were preserved |
| 2026-11-04 | Final verify/build/public E2E after real-session run | Passed | 472/472 synthetic tests, 41/41 guard tests, types/lint/format/journal/dependency/task checks, isolated build and 10/10 public Chromium; no code repairs |
| 2026-11-04 | Neon/OAuth/application migrations | Not run | Not authorized; migration files used only for the approved empty local fixture |

## Log

- 2026-11-04 — Saved the complete approved scope before application changes.
  Reviewed Next route/cache conventions and PostgreSQL/Neon guidance. No auth
  migration, dependency install, database access or staging command by this agent.
- 2026-11-04 — First implementation passes types and 440 existing tests. Added
  pool event handling, bounded SQL transactions including auth adapter, no-update
  quota denial, minute-paced pruning, direct-only migration config, RR snapshots
  and account-scoped metadata ETags. No schema change/migration needed for ETags.
- 2026-11-04 — Scheduler/transport now handle throttling, coalescing and hidden/
  offline pause. Added pure clock-driven tests and SQL/token regressions; expanded
  suite 464/464 before the latest cooldown/lazy-owner race regression additions.
- 2026-11-04 — Replaced the initial metadata-token optimization before rollout:
  old/in-flight writers would not invalidate a new token. Aggregate existing
  revision sums/counts instead; all existing writers already increment revisions
  and use tombstones. This transfers three narrow rows, not payloads, but still
  scans revisions in PostgreSQL. Added an old-writer invalidation regression.
- 2026-11-04 — Index fingerprint initially e7c918299253a47524283a6ffea80952715ebc0f5cea0857f76af16d786654be.
  The index changed externally during work (own edits appeared staged). No git
  add/reset/restore command was run. Preserve the current index; do not restore
  its earlier fingerprint or claim it stayed byte-for-byte unchanged.
- 2026-11-04 — Final local checks pass: 472 synthetic/PGlite tests, 41 guard
  tests, full verify, isolated build and 10 public browser journeys. Added six
  opt-in real-session cases and an empty dedicated-database guard; collection and
  types pass, actual execution remains blocked. No scripts, images, dependencies,
  servers or remote services were installed/started. Task stays active, not done.
- 2026-11-04 — Local-service permission granted. OrbStack's local Docker daemon
  responds during inspection; port 65432 has no listener. Inspect image/cache,
  create one owned tmpfs-backed test container and never stop other workloads.
- 2026-11-04 — Official PostgreSQL 17.11 (arm64) image downloaded and pinned by
  image ID sha256:9355df27b2506973cfc421408623435f15298511c2cdadc502b7aa580efe611f.
  Created avo-pg-012-6c952cffd115 with 512 MiB PGDATA tmpfs, 127.0.0.1:65432,
  synthetic generated password, role avo_test and empty avo_test_resilience.
  The six-case suite passed first run (349 ms tests / 665 ms total); no code
  repairs or threshold changes were needed. Migrations were applied only to
  this fresh fixture, never to application/Neon databases.
- 2026-11-04 — Verified the exact created container ID, image and owner nonce
  labels before teardown; stopped/removed only that container, then deleted its
  disposable credential after checking the private temp root and owner marker.
  The non-secret first-run log remains at /tmp/avo-postgres-012.FBdD6P/first-run.log.
  All 12 other containers remain running; OrbStack stays available and the
  downloaded image stays cached. No .env, application data or Neon access.
- 2026-11-04 — Final verify, 41 task-guard tests, build and 10 public E2E rerun
  all passed after real PostgreSQL verification. Closed task 012's local scope;
  no deployment, application migration, commit or staging command performed.
  Local PostgreSQL is not evidence for a live Neon/PgBouncer or OAuth deployment.
