# 013 — Aislar verificaciones PostgreSQL del entorno de auth

id: 013
updated: 2026-11-04

## Goal

Make `db:health` and `db:verify` use only the database URL selected from the
explicit env file. They must not import the app runtime/client or require
`BETTER_AUTH_SECRET`, OAuth credentials or `BETTER_AUTH_URL`. Validate this with
pure local tests and project checks without opening `.env.prod` or connecting to
Neon.

## Out of scope

- Reading/editing `.env` or `.env.prod`, database/Neon access, migration, data
  changes, deploy, auth/config changes, package/lockfile changes or commits.
- Changing the reports' query/result/privacy contract or direct/pooled precedence.

## Next step

Local scope is complete. For actual production database health/schema output,
the owner may now run `npm run db:health:prod` / `npm run db:verify:prod`; those
commands read `.env.prod` but will not inspect auth configuration. They do query
the configured Neon database; this implementation session did not run them.

## Checklist

### Implementation

- [x] Parse only `DATABASE_URL_UNPOOLED` (preferred) or `DATABASE_URL` from the
  explicitly requested env file; reject malformed/missing URLs generically.
- [x] Create a bounded, one-connection Drizzle client over the existing schema;
  no import of `lib/env.ts`, Better Auth, OAuth values or app `db` singleton.
- [x] Preserve `db:health`/`db:verify` reports and use `finally` to close pools.
- [x] Add unit coverage proving a prod target needs only an unpooled DB URL;
  never read the actual secret env files.

### Completion

- [x] Run focused tests, `npm run verify`, isolated build; review exact diff and
  preserve staging. Do not call any `db:health*`/`db:verify*` script against Neon.
- [x] Checkpoint result and board, then run `npm run check:tasks`.

## Files

- `scripts/db-health.ts` — read-only connection probe.
- `scripts/db-verify.ts` — read-only schema/count verification.
- `lib/db/inspection.ts` — isolated URL selector and client factory.
- `lib/db/inspection.test.ts` — no-auth-secret URL/validation coverage.

## Decisions

- 2026-11-04 — Owner asked to continue after seeing that `db:verify:prod` fails
  before connecting because its app-client import requires the Better Auth secret.
- 2026-11-04 — Verify both health and schema scripts: they share the same faulty
  `lib/db/client.ts` import. Do not fix only the command in the question.
- 2026-11-04 — Checks may use a direct or pooled URL supplied explicitly; prefer
  `DATABASE_URL_UNPOOLED`, matching current script behavior.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-04 | Working tree/index | Passed | Clean tree; no staged changes; HEAD checked before edits |
| 2026-11-04 | `npm run verify` | Passed | 479/479 tests in 50 files, types, lint, format, dependency checks, migration journal, task guard; isolated copy |
| 2026-11-04 | `npm run build` | Passed | Isolated copy/local synthetic credentials; no Neon or private env |
| 2026-11-04 | Focused URL selection tests | Passed | Auth secrets absent; direct-preference/fallback and malformed target cases |
| 2026-11-04 | `db:verify:prod` / `db:health:prod` smoke | Passed boundary | Synthetic `.env.prod` in isolated copy targets only `127.0.0.1:1`; both report host and reach SQL, then expected connection failure; no Auth error |
| 2026-11-04 | `.env.prod` / Neon | Not read or run | Real credentials/data and remote connection not touched |
| 2026-11-04 | `git diff --check`, cached diff and task guard | Passed | No whitespace errors; no staging commands |

## Log

- 2026-11-04 — Reproduced from code: both scripts dynamically imported
  `lib/db/client.ts`, which imports `lib/env.ts`; auth correctly requires
  BETTER_AUTH_SECRET, but that is unrelated to a SQL-only inspection.
- 2026-11-04 — Added `lib/db/inspection.ts` and removed both app-client imports.
  Production target selection now accepts an auth-secret-free env map; URL errors
  are generic, and diagnostics print the chosen host before connecting.
- 2026-11-04 — First isolated typecheck exposed a strict optional dotenv map
  type; changed the selector input to model missing dotenv keys explicitly.
- 2026-11-04 — A Prettier invocation initially included `.env.example` (unsupported
  parser); format checks pass via project `format:check`. No env file was read.
- 2026-11-04 — First isolated verify guard missed the safe `.env.example` template
  due to the copy's `.env.*` exclusion; copied the public template and reran.
  First build used a symlinked external node_modules and Turbopack refused it;
  replaced it with an isolated copy-on-write dependency tree; build passed.
- 2026-11-04 — Both production command paths were smoke-tested only in the isolated
  copy with a synthetic loopback port 1 URL and no auth secrets. They printed the
  selected `127.0.0.1` target and reached their SQL statement before expected
  connection failure; no Neon or real `.env.prod` access.
- 2026-11-04 — Final `npm run verify` passed: 479/479 tests and all configured
  local checks; isolated production build passed. Closed only this local config
  dependency issue; no remote db:verify/health, migration or data was accessed.
