# 028 — Investigate silent migration CLI failure

id: 028
updated: 2026-11-08

## Goal

Determine with executable evidence whether the owner's silent production migration
output is consistent with a Drizzle CLI reporting defect or a reproducible local
Node/Drizzle/pg incompatibility. Identify what production evidence is still
required before recommending a repair. Do not call production healthy or fixed
without a verified schema and successful account request.

## Out of scope

- Production/development migrations, data writes, seeds, restores or deletions.
- D1 migration, dependency installation/upgrades, lock/configuration changes,
  authentication/security policy changes, commits, pushes or deploys.
- Reading or exporting personal rows, secrets, raw private errors or SQL parameters.
- Treating local/PGlite results as proof of Neon, deployed runtime or OAuth behavior.

## Next step

Obtain the production recovery prerequisite and inspect only catalog/journal
metadata on the confirmed .env.prod target. Compare visible/public routine
tables, search_path, migration timestamps/hashes and privileges before proposing
any production repair. Node alignment is verified separately in task 029;
its passing checks do not establish production schema health.

## Checklist

- [x] Inspect the migration config, journal, installed package contracts and CLI error path.
- [x] Verify dependency graph/lock consistency and available runtimes.
- [x] Reproduce CLI success, repeated migration, invalid SQL and refused connection in disposable local targets.
- [x] Compare behavior on installed Node 24 and 26; explicitly record missing pinned Node 22.
- [x] Validate all six generated migrations and routine-table visibility on a fresh synthetic database.
- [x] Run applicable local unit/integration and migration/policy checks without private env files.
- [ ] Inspect production metadata only after recovery prerequisite is satisfied; otherwise record the blocker without claiming a schema result.
- [x] Report confirmed local defects, remaining hypotheses, validation limits and the smallest proposed repair.
- [x] Checkpoint the task/board and run the task guard; keep this task open for production evidence.

## Files

- `drizzle.prod.config.ts` — reads only the direct connection from the private production env file.
- `lib/db/migration-url.ts` — migration target validation.
- `drizzle/meta/_journal.json` — six generated entries through 0005.
- `drizzle/0005_orange_jack_flag.sql` — routine table definition.
- `scripts/db-verify.ts` — existing production verifier does not require routines.
- `lib/sync/server-version.ts` — failing production stage queries routines for protocol v2.
- `package.json` / `package-lock.json` — authoritative package compatibility boundary.

## Decisions

- 2026-11-08 — Owner explicitly authorized executing an exhaustive investigation;
  this is Verify, not permission to migrate production or repair dependencies.
- 2026-11-08 — Owner confirmed the `.env.prod` destination is production. A
  recovery point remains unconfirmed; no Neon CLI/API/MCP access is available
  to inspect its settings. Do not silently waive that project prerequisite.
- 2026-11-08 — Use existing dependencies and installed runtimes only. Temporary
  synthetic fixtures may be written outside the repo; do not patch node_modules.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-08 | Initial Git inspection | Passed | Clean main tracking origin/main before investigation; no user changes to overwrite. |
| 2026-11-08 | Installed package contracts | Passed | Drizzle Kit 0.31.11, ORM 0.45.4, pg 8.23.1, Better Auth/adapter 1.7.15 satisfy inspected peer ranges; executable graph check pending. |
| 2026-11-08 | Static CLI error handling | Confirmed defect | Bundled hanji renderWithTask calls terminal.reject then exit(1); MigrateProgress renders rejected as applying and does not print the error. Execution reproduction pending. |
| 2026-11-08 | Runtime inventory | Partial | Shell uses Node 26.13.0; installed Node 24.21.0/25.8.0/20.20.2. Project pins 22, which is not installed in inspected locations. No download/install authorized. |
| 2026-11-08 | Production schema/recovery | Not run | Destination/SQL inspection authorized, but recovery point or explicit scoped exception remains unconfirmed. No API key/CLI available to independently inspect recovery. |
| 2026-11-08 | CLI execution matrix on Node 26.13.0 and 24.21.0 | Passed | Eight CLI runs: fresh six migrations and repeat exit 0 with success marker; synthetic 42P01 and refused loopback exit 1, show only applying, hide the actual cause. Fixture: `/tmp/avo-migration-review-uPJfXD/review.mjs`, captured synthetic logs and `results.json`. No private env files or real credentials loaded. |
| 2026-11-08 | Persisted synthetic schema/rollback | Passed | Both runtimes persisted all six migrations and public.runo_routines; repeat kept six journal entries. Failed fixture rolled back its table and left zero applied entries. PGlite/PostgreSQL semantics, not a live Neon/pg TCP success test. |
| 2026-11-08 | Direct driver/ORM comparison | Passed | Without CLI rendering, the same synthetic SQL exposes SQLSTATE 42P01 and direct pg exposes ECONNREFUSED. The SSL warning appears for refused loopback too; it does not identify the actual failure. |
| 2026-11-08 | Full local unit/integration suite on each runtime | Passed | 550/550 in 54 files on Node 26 and separately 550/550 on Node 24; synthetic loopback/auth environment. Not 1,100 distinct tests and not deployed/OAuth verification. |
| 2026-11-08 | Installed dependency graph | Passed with findings | `npm ls --all --json` exits 0; no incompatible pg/Drizzle/Better Auth peers. Reports two extraneous packages (@emnapi/runtime, @img/sharp-wasm32), unrelated to the demonstrated migration rendering failure; not removed. |
| 2026-11-08 | Shell dependency policy | Failed (pre-existing toolchain drift) | Shell uses npm 11.20.0, but project policy requires 11.11.0. No policy or package settings were weakened to make it pass. |
| 2026-11-08 | Existing pinned npm dependency policy/tests | Passed | Ran existing npm 11.11.0 CLI from installed Node 25 directory under current Node; policy passed and 2/2 policy tests passed. No installation, PATH/config mutation or user-agent spoofing. |
| 2026-11-08 | Migration journal, lint, format and guard tests | Passed | `db:check`, `lint`, `format:check`, 41/41 task-guard tests. No source/configuration repair. |
| 2026-11-08 | Node 22 / independent PostgreSQL / build / remote checks | Not run | Pinned Node 22 not installed; Docker local context has no usable cached Postgres target (no pull/start/install attempted). No Next/UI changes, so no build/E2E repeated. No production reads/migrations or OAuth calls. |

## Log

- 2026-11-08 — Began owner-authorized exhaustive Verify investigation. Previous
  attempts to read `tests/pglite.ts` found the helper absent; actual integration
  suites instantiate PGlite directly. Reading package.json through package
  exports was rejected; inspected files directly instead. Neither issue is
  evidence of a production/library failure.
- 2026-11-08 — Executed actual installed Drizzle CLI against disposable PGlite
  files and an absent 127.0.0.1 listener on Node 24/26. Reproduced both error
  suppression paths and confirmed the positive success marker on good/repeated
  migrations. This confirms the reporting defect, not the owner's original
  migration outcome or the missing production relation.
- 2026-11-08 — Both full 550-test runs, lint/format/journal and policy/guard
  regressions pass. Found environment drift (Node 26 vs pinned 22 and npm 11.20
  vs pinned 11.11), but did not reproduce it as the migration failure cause.
  Production root cause remains open pending its recovery prerequisite.
- 2026-11-08 — Owner chose to align Node/npm/types before any production work.
  Parked this investigation in backlog; task 029 owns the separately approved
  toolchain/configuration change. Existing findings and production limits remain
  unchanged; alignment alone does not repair 42P01 or the CLI reporting defect.
- 2026-11-08 — Task 029 completed source/CI alignment to Node 26.13.0 / npm
  11.20.0 and Node 26 definitions. Clean install, 550 tests, full checks/build
  and 31 public Chromium journeys passed; no production access or migration.
  Keep this incident in backlog until its own authorized prerequisites are met.

## Discoveries

- Confirmed upstream CLI reporting defect: any rejected migration task can exit
  1 while suppressing the SQL/connection error. Proposed repair (not authorized
  in this Verify): a privacy-safe migration runner/diagnostic boundary using
  existing dependencies, without raw SQL, parameters or credentials in logs.
- `scripts/db-verify.ts` can report required schema complete without checking
  routine columns. Proposed follow-up: include v2 routine requirements and
  compare actual migration journal/schema rather than only journal count.
- Initial Node/npm drift was addressed by owner-approved task 029, with clean
  isolated verification; historical results above retain their original pins.
  Two non-database packages remain extraneous in the owner's unchanged working
  install. Neither finding was demonstrated as the production SQL failure cause.
