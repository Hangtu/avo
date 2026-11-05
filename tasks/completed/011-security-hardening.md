# 011 — Security hardening M1, M3, M4, B1, B3

id: 011
updated: 2026-11-04

## Goal

Implement the five findings approved by the owner: stop retaining unnecessary
OAuth tokens on new writes, shared atomic auth/account rate limits, fail-closed
dependency installation plus CI audit, a measurable report-only CSP compatible
with the static shell, and environment-based LAN dev hosts. Pass local checks
and clearly separate code readiness from remote activation.

## Out of scope

- M2 identity/linking policy, B2 account deletion, new providers or services.
- Applying migrations, deleting/backfilling historical tokens, touching real
  credentials or data, provider/Neon tests, deploying, committing or pushing.
- Enforcing CSP without browser/device measurement, disabling Cache Components
  or Partial Prefetching, upgrading dependency versions to suppress advisories.

## Next step

Local implementation is complete. The next external step needs separate owner
authorization: review migration 0004, confirm destination/recovery, apply and
verify it, then measure authorized OAuth/device behavior. Historical-token
cleanup and CSP enforcement remain separate gates recorded on the board.

## Checklist

### Approved plan (owner request 2026-11-04)

- [x] Record synthetic baseline and preserve the clean starting diff (932d2f1).
- [x] M1: discard OAuth access/refresh/ID tokens in account create/update hooks;
  keep provider/account identity and sessions unchanged; test actual DB writes.
- [x] M3: add a generated additive migration for hashed expiring counters; atomic
  PostgreSQL consumption shared by auth and account APIs; exact trusted IP
  source, safe fallback, per-account budgets, 429/Retry-After and fail closed.
- [x] M3: cover concurrent consumption, expiry, isolation, missing/spoofed IP,
  auth rules, session probe, reads/writes and store outage with synthetic tests.
- [x] M4: block every dependency lifecycle script by default, pin npm in all CI
  installs, preserve/check the authoritative lockfile and audit high/critical.
  Review existing installers; allow zero unless a clean frozen install needs one.
- [x] M4: investigate missing lock integrity via npm only in an isolated copy;
  preserve versions, verify a clean script-disabled install/build, document
  moderate-advisory deferrals with a review date; never force remediation.
- [x] B1: add static strict CSP report-only headers, tests and browser measurement
  instructions; update ADR 0002 to preserve static/PPR instead of nonces.
- [x] B3: parse exact LAN dev hostnames from env (no wildcard), document opt-in
  and test malformed values and production behavior; do not edit private .env.

### Completion

- [x] Run npm test, typecheck, lint, format:check, db:check, check:tasks and build
  in an isolated copy; run approved public E2E after build if tooling exists.
- [x] Review diff, record actual validation and rollout limitations, update
  project context/board and route remaining manual work; run task guard.

## Files

- `lib/auth.ts` — provider-only identity and auth configuration.
- `lib/sync/server-auth.ts` — account boundary and session preconditions.
- `app/api/account/data/route.ts` — authenticated durable-data requests.
- `app/api/account/me/route.ts` — session probe.
- `next.config.ts` — headers and development hosts.
- `.github/workflows/app-ci.yml` — application install and quality checks.
- `.github/workflows/production-migrations.yml` — protected migration install.
- `docs/decisions/0002-defer-nonce-csp.md` — CSP rationale and measurement gate.

## Decisions

- 2026-11-04 — Owner approved implementation of M1/M3/M4/B1/B3, not M2/B2.
- 2026-11-04 — Better Auth 1.7.15 writes idToken directly on several paths;
  encryptOAuthTokens alone is insufficient. No provider API is used after login,
  so omit all three token types at the persistence hooks instead.
- 2026-11-04 — Installed Next guide says nonce CSP is incompatible with PPR;
  start with static report-only, without falsely claiming injection prevention.
- 2026-11-04 — Shared PostgreSQL uses existing infrastructure; generate but do
  not apply the additive migration. No Redis/service/direct dependency additions.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-04 | git status / staged and unstaged diff | Passed | Clean starting tree, HEAD 932d2f1 |
| 2026-11-04 | Isolated baseline `npm test` | Passed | 410/410 in 40 files, existing installed deps; no private env copied |
| 2026-11-04 | Clean `npm ci --ignore-scripts` | Passed | Isolated macOS copy, npm 11.11.0 / Node 25.8.0; zero approved rebuild scripts |
| 2026-11-04 | `npm test` after changes | Passed | 440/440 in 43 files; actual Better Auth/PGlite token hooks, atomic counters and transient 429 outbox |
| 2026-11-04 | `npm run typecheck` | Passed after test fix | Initial TS2554 in synthetic createUser call; added required provisioning source; rerun passed |
| 2026-11-04 | lint / format:check / db:check | Passed | No lint/format warnings; journal valid, no database connection |
| 2026-11-04 | dependency guard / native guard tests | Passed | Dependency tests 2/2; task guard tests 41/41 |
| 2026-11-04 | `npm run build` | Passed | Synthetic loopback credentials; Cache Components/PPR retained; public routes static |
| 2026-11-04 | Public `npm run test:e2e` | Passed | 10/10 Chromium; CSP delivery and report-only event; no authenticated journey |
| 2026-11-04 | Native npm lock audit | Passed high/critical gate | 12 moderates full lock, 4 with omit=dev; deferred with reachability/review date 2026-11-18 |
| 2026-11-04 | `npm audit signatures` | Passed | 516 registry signatures, 161 attestations; installed macOS graph only |
| 2026-11-04 | GitHub Actions / Linux Node 22 | Not run | Workflows edited locally; no push/remote CI authorized |
| 2026-11-04 | Final frozen offline install + npm run verify | Passed | Lock SHA256 unchanged; all SHA512 present; no existing locked version changes |
| 2026-11-04 | Final build / public E2E rerun | Passed | 10/10; synthetic env; original .next untouched |
| 2026-11-04 | Schema/snapshot consistency | Passed | Native db:generate reports no schema changes; no DB connection |
| 2026-11-04 | git diff --check / task guard | Passed | No whitespace errors; 8 tasks, zero errors/warnings |
| 2026-11-04 | Neon, OAuth, historical token cleanup, deploy | Not run | Not authorized; no real data accessed |

## Log

- 2026-11-04 — Saved approved plan before implementation; parked 003 in backlog
  with its existing Next step, validation and provider checks intact.
- 2026-11-04 — Found 517 registry lock entries without integrity/resolved fields;
  investigated with npm, not hand editing or version upgrades.
- 2026-11-04 — M1 hooks, shared atomic limiter/migration, CI script/audit gates,
  report-only CSP and env dev hosts implemented. Real PGlite adapter tests pass;
  no Neon, OAuth or historical-data operations performed.
- 2026-11-04 — Native v3→v1→v3 metadata repair restores all missing SHA512 hashes;
  no existing locked version changes. Six optional WASI placements added by npm.
  Registry URLs can remain implicit; policy pins registry plus exact version/SRI.
- 2026-11-04 — Isolated clean npm ci --ignore-scripts succeeds with zero script
  approvals. Baseline: 410/410. First expanded suite: 439/439. Lint, format and
  migration journal pass; typecheck identifies a test-only createUser source
  argument missing. Added the required source and reran successfully.
- 2026-11-04 — A targeted Prettier command included .env.example (unsupported
  parser); it formatted supported files and returned 2. No env content changed;
  subsequent project format:check passes. Do not add env files to that command.
- 2026-11-04 — All local implementation checks now pass, including production
  build and 10 public browser journeys. The owner\'s running dev build and private
  env were not touched. db:verify schema requirements now include the new table,
  but no remote verification or migration was run.
- 2026-11-04 — Corrected Doctor\'s reachability wording: 4 moderates survive
  omit=dev through Better Auth → Drizzle Kit. The esbuild dev server is not an
  app route; the production dependency presence is documented, not dismissed.
- 2026-11-04 — Final script-disabled offline reinstall preserves lock SHA256
  37f106552abd9b23508e6bb2bf20bd1602efe795fab67eaa0d99e6736178f1c9.
  npm run verify passes; final build and 10/10 public E2E pass after the clean
  install. Native schema generation finds no changes. Closed local scope only;
  activation/token cleanup/CSP enforcement are routed to board gates, not claimed
  as remotely complete. 003 stays in backlog; no next task starts automatically.
