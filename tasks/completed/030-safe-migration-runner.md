# 030 — Privacy-safe migration runner

id: 030
updated: 2026-11-08

## Goal

Both migration commands report start, stage, elapsed time, safe failure signals and an unambiguous terminal result/exit status, without exposing private errors or changing Drizzle's migration/journal semantics. Validate exclusively with disposable synthetic fixtures; real migration execution and publication are not required for completion.

## Out of scope

- Real development/production migrations, Neon/OAuth connections, schema inspection, restores, seeds or private env changes.
- Editing generated SQL, journal/snapshots, dependencies/lockfile, CI triggers/approvals, auth, application sync or SSL policy.
- The separate routine/schema-journal verifier improvement from task 028.
- Commit, push, deploy, or attributing the resolved production incident to this change.

## Next step

Owner may review the local diff. Publication and any real database operation require separate authorization, confirmed target and applicable recovery prerequisites; no implementation or validation work remains in this task.

## Checklist

### Runner and safety

- [x] Execute failing regressions for environment selection, privacy, failures, cleanup, progress and exit codes.
- [x] Use existing Drizzle ORM/pg dependencies; preserve direct-URL validation, `.env`/CI development precedence and production file-only `.env.prod` selection.
- [x] Keep generated SQL/journal untouched and use Drizzle's existing migrator/transaction behavior, including already-applied migrations.
- [x] Emit bounded allowlisted diagnostics, stages, periodic progress and elapsed time; never raw SQL, parameters, URLs, private messages/stacks or personal data.
- [x] Close connections after success/failure, handle idle pool errors safely, bound connection/SQL waits, and never retry automatically or claim rollback after an ambiguous connection failure.
- [x] Switch only the two npm migration commands; document operation, safety boundaries and limits without enabling CI or executing real migrations.

### Validation and closure

- [x] Test all repository migrations/repetition/rollback in disposable PGlite and real CLI failure/exit behavior against refused loopback only.
- [x] Run approved dependency policy/tests, full tests, types, lint, format, journal/task guards and isolated production build with synthetic configuration.
- [x] Confirm existing staged documentation and migration/lockfile/CI contents remain preserved; route discoveries and close the task with evidence.

## Files

- `scripts/db-migrate.ts` — thin CLI and last-resort safe failure boundary.
- `lib/db/migration-runner.ts` — environment selection, Drizzle/pg lifecycle, safe progress/results.
- `lib/db/migration-runner.test.ts` — 26 boundary regressions.
- `tests/migration-runner-postgres.test.ts` — 3 disposable SQL/journal cases.
- `tests/migration-runner-cli.test.ts` — 4 real CLI process failures against synthetic targets.
- `package.json` — migration command entry points and existing dependencies.
- `drizzle.migrate.config.ts` — development/CI environment precedence to preserve.
- `drizzle.prod.config.ts` — production file-only target semantics to preserve.
- `lib/db/migration-url.ts` — direct connection validation; no pooled/local fallback.
- `lib/observability/account-diagnostics.ts` — existing bounded safe error extraction to reuse.
- `docs/cloud/github-actions-migrations.md` — operating and recovery prerequisites.

## Decisions

- 2026-11-08 — Owner explicitly approved implementing the proposed development/production runner. This is not authorization to execute real migrations or publish changes.
- 2026-11-08 — Log only fixed environment/source/stage labels and existing safe error signals. Treat database connection strings, SQL errors, parameters and library error objects as private; never pass them directly to a console/logger.
- 2026-11-08 — Preserve pending staged task 028/029 closure documentation; working installation still has Node 20 declarations, so final Node 26 type verification/build will use an isolated script-disabled install/copy rather than disturb the owner's development environment.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-08 | Read-only orientation | Passed | Node 26.13.0/npm 11.20.0; installed Drizzle migrator uses the default `drizzle.__drizzle_migrations` journal and a transaction for pending SQL. No connection opened. |
| 2026-11-08 | Regression red phase | Failed as expected | New boundary suite could not import the absent runner; the old CLI's hidden-error rejection was already independently reproduced in task 028. |
| 2026-11-08 | Focused runner checks | Passed | 33 tests / 3 files: 26 boundary cases (including actual pg pool options/listener/cleanup with connect replaced), 3 disposable PGlite cases and 4 real CLI failures against refused loopback. No Neon/TCP migration success claim. |
| 2026-11-08 | Isolated `npm run verify` | Passed | 583 tests / 57 files, 4 dependency-policy tests, format/lint/types (Node declarations 26.6.6), migration journal and task guard. Evidence: `/tmp/avo-migration-runner-check.4qrPPR/evidence/verify.log`. |
| 2026-11-08 | Task-guard regressions | Passed | 41 tests / 8 suites; `evidence/task-tests.log` in the same isolated directory. |
| 2026-11-08 | Isolated production build | Passed | Next 16.4.3, 13 static pages and generated service worker; Cache Components/PPR preserved, synthetic loopback config only. `evidence/build.log`; repeated successfully after the final test-only addition. |
| 2026-11-08 | Final preservation review | Passed | Both hashes below unchanged; no diff in generated migrations/journal, lockfile, CI, URL validator or Drizzle configs. Tested source files match the working copy byte-for-byte. |
| 2026-11-08 | Closure guard and whitespace | Passed | After moving to completed: 27 tasks, 0 errors/warnings; `git diff --check` clean and the pre-existing staged-diff hash unchanged. |
| 2026-11-08 | External/manual verification | Not run | No Neon/OAuth/real migration, read-only production inspection, remote CI, restore, public browser/device run or publication. CLI-only change; PGlite rollback evidence is not a production commit-outcome guarantee. |
| 2026-11-08 | Preservation baseline | Recorded | Lock SHA-256 `a370ca63234ba3ee8779e97b07a01c02204bdcfd567aadbd767e5866a0ad8d57`; staged diff SHA-256 `1879357830d5a60f1df845b0a978e71b696c2a0d4773695a3393993ec702b00d`. |

## Log

- 2026-11-08 — Implementation and all required checks complete. Closing task 030 without commit/push/deploy or real DB execution. Separate routine/schema-journal verification stays in the board's unapproved icebox; no new product or security-policy work was started.
- 2026-11-08 — Final isolated verification passed with a clone of the prior script-disabled Node 26 dependency installation (identical lockfile), without reinstalling or changing the working node_modules/.next. Fixed an unused mock parameter flagged by zero-warning lint and restored the tracked public `.env.example` omitted from the first isolation copy; no checks were weakened, and no private env file was copied.
- 2026-11-08 — Implemented the thin CLI and runner with existing safe error extraction and Drizzle's migrator. Fixed two test-fixture mistakes before the green run: Vitest argument-table spreading, and initially guessed journal tags replaced with validated copies of the actual journal. The latter initially caused a fixture-only PGlite initialization rejection; lazy boundary initialization and faithful metadata removed it. No application migration files were edited.
- 2026-11-08 — Saved the approved plan before implementation. Task 028 remains closed on owner-reported production acceptance; this follow-up addresses CLI observability only.
