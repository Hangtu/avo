# 026 — Private account failure diagnostics

id: 026
updated: 2026-11-07

## Goal

Automatically emit safe, structured diagnostics for unexpected private account
API failures: a server-generated request ID, operation, failed stage, elapsed
time and allowlisted technical error signals. Correlate the response with its
server log without exposing internal errors or personal data. Validate locally
with automated tests; identifying or fixing the production incident is not this goal.

## Out of scope

- Production/Neon/OAuth access, deployment, migrations, dependency/config changes.
- Changing authentication, authorization, rate-limit budgets, retries or HTTP bodies/statuses.
- Logging SQL, parameters, raw messages/stacks, cookies, tokens, account IDs or personal data.
- Third-party telemetry, new persistent stores, UI or manual browser testing.

## Next step

No remaining local implementation step. Deployment is separate and requires
owner authorization; after deployment, normal account traffic will generate the
diagnostic events automatically. The existing production incident remains
unidentified until real runtime evidence is available.

## Checklist

- [x] Add bounded, allowlisted error classification and request-local timing/stages.
- [x] Instrument account GET/POST/probe, limiter consumption/cleanup and account reads/writes without changing behavior.
- [x] Preserve generic private responses and attach a generated correlation header.
- [x] Test failure stages, nested causes, unsafe errors, concurrent requests, expected errors and existing HTTP behavior.
- [x] Document log fields, examples, limitations and automatic incident lookup.
- [x] Run required tests, types, lint, format, migration journal, task guard and isolated build.
- [x] Review diff/privacy, complete the task and update board/guard.

## Files

- `app/api/account/data/route.ts` — account GET/POST boundary.
- `app/api/account/me/route.ts` — session probe boundary.
- `lib/sync/server-auth.ts` — shared session and error handling.
- `lib/sync/server-repository.ts` — account persistence stages.
- `lib/security/rate-limit-store.ts` — shared limiter storage/cleanup.
- `tests/account-data-route.test.ts` — existing HTTP contract and mocked boundary tests.
- `lib/observability/account-diagnostics.ts` — request scopes, allowlisted signals and one JSON boundary event.
- `lib/observability/account-diagnostics.test.ts` — privacy, timing, concurrency and recovered errors.
- `tests/account-diagnostics-postgres.test.ts` — actual SQL errors in disposable PGlite.
- `docs/cloud/2026-11-07-account-diagnostics.md` — activation, fields, incident lookup and limitations.

## Decisions

- 2026-11-07 — Owner explicitly approved reassignment from branch-local 023 to 026 during merge-conflict resolution; incoming 023 (unified task moments) keeps its identity. Historical diagnostic verification evidence remains unchanged.

- 2026-11-07 — User authorizes implementation of diagnostic code and local automated tests. No remote requests or deployment authorized.
- 2026-11-07 — Preserve the existing account HTTP contract rather than adopting the reference kit's alternative API/error schema. Local console JSON output only; no third-party analytics or services.
- 2026-11-07 — Request-local async context avoids passing client data into logs and isolates concurrent requests. Technical signals use allowlists; unknown failures remain explicitly unknown, not guessed causes.
- 2026-11-07 — Suppress false-positive framework control-flow events by using installed Next `unstable_rethrow` at the shared boundary; installed documentation and a red/green route regression justify this narrowly scoped correction.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-07 | Initial inspection | Passed | Working tree/staged diff clean; no active task. No production calls or project scripts during preceding Doctor. |
| 2026-11-07 | Route regression before implementation | Failed as expected | Existing error response lacked X-Request-Id and structured diagnosis; 18 existing cases passed, new assertion failed. |
| 2026-11-07 | Targeted automated tests | Passed | 42/42 in 3 files: 27 route cases, 8 diagnostic unit cases and 7 real-SQL PGlite cases. No network/Neon/OAuth. |
| 2026-11-07 | `git diff --check` | Passed | No whitespace errors. |
| 2026-11-07 | Initial task guard | Passed | 20 tasks, 0 errors, 0 warnings. |
| 2026-11-07 | Initial isolated full checks | Passed with discovery | 512/512 tests, types/lint/format/journal/task guard and build passed. Build exposed two false-positive account events for framework PPR control flow; addressed before final verification. |
| 2026-11-07 | Framework control-flow regression before correction | Failed as expected | Real Next redirect was swallowed into a 503; added installed `unstable_rethrow` before account error classification. |
| 2026-11-07 | Route regression and rebuilt production bundle | Passed | 28/28 route cases; isolated rebuild has no account_request_failed events during prerender and retains Cache Components/PPR. |
| 2026-11-07 | Final isolated `npm test` | Passed | 513/513 tests across 54 files, including 43 focused diagnostic/route/PGlite cases. |
| 2026-11-07 | Final isolated `typecheck`, `lint`, `format:check`, `db:check`, `check:tasks` | Passed | All commands passed; 20 tasks, 0 errors/warnings. No private env files copied. |
| 2026-11-07 | Automated production-runtime smoke, initial assertion | Failed | Response correlation, private 503 and stage path passed; an overstrict ad hoc expectation required a message signal, but pg emitted ECONNRESET instead. No application defect established. |
| 2026-11-07 | Automated production-runtime diagnostic capture | Passed | Isolated `next start`, fake loopback PostgreSQL transport: one event, matching X-Request-Id, stagePath rate_limit.ip/consume, actual ECONNRESET code and no synthetic private input. Process/listener stopped in finally. |
| 2026-11-07 | Diff/privacy review | Passed | No dependencies/config/schema/migration changes; no raw error, SQL, stack, headers or personal IDs in the diagnostic payload. Whitespace clean. |
| 2026-11-07 | Final task move/board and `check:tasks` | Passed | Task moved to completed, active focus cleared, documentation link updated; 20 tasks, 0 errors/warnings. |
| 2026-11-07 | Production/Neon/OAuth/device/E2E | Not run | No remote authorization; no UI changes. No production fix/deployment claimed. |

## Log

- 2026-11-07 — Saved approved plan before implementation. Installed Next 16.4.3 route-handler guide and applicable project standards reviewed.
- 2026-11-07 — Added automatic safe boundary events and request IDs, detailed limiter/read stages, bounded cause extraction and concurrency/recovery-safe context. Real SQL column/table/cleanup failures correctly produce their stage and SQLSTATE. Exact pg timeout signatures were verified against installed source. Prepared isolated copy without private env files; production remains untouched.
- 2026-11-07 — Initial isolated checks passed but revealed pre-existing swallowed PPR control-flow errors as false outage events. Added/ran failing regression, applied documented rethrow, then confirmed route tests and production rebuild pass without false events.
- 2026-11-07 — Final full checks passed (513 tests); automated built-runtime capture confirmed actual ECONNRESET evidence and ID/stage correlation without touching a real database. The initial ad hoc message-signal assertion was too specific for socket-reset transport behavior and is recorded above. Reviewed privacy/behavior diff and completed local instrumentation; deployment and real incident diagnosis remain separate.
