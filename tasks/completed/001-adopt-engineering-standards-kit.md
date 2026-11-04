# 001 — Adopt the engineering standards kit

id: 001
updated: 2026-11-04

## Goal

Adopt `agentic-nextjs-template` at `3dd8ab1` into `docs/agent-kit`, with an
approved project contract, application CI, automated formatting, static security
headers, Zod environment validation, public E2E with axe, and the two
application ADRs. Every local check passes before starting new work.

## Out of scope

- Replacing the stack, moving the app to `src/`, or authenticated E2E.
- Neon migrations, real OAuth users, deployment, push, or commit by inference.

## Next step

Done: adopted at `8e3be9a`. See the Log and Validation for evidence.

## Checklist

### Kit and contract

- [x] Copy the reference library into `docs/agent-kit/` at an exact commit.
- [x] Write `docs/agent-kit/project-context.md` with mode `existing` and all ten capabilities resolved.
- [x] Add one integration block to `AGENTS.md` and operation/permission rules.

### Baseline hardening

- [x] Add Prettier, `.editorconfig`, `.gitattributes`, Node/engine pins and Dependabot.
- [x] Add `LICENSE`, `SECURITY.md`, `app-ci.yml` and the `verify` script.
- [x] Validate `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and OAuth pairs with Zod.
- [x] Add static security headers, `poweredByHeader: false` and `/api/*` noindex.
- [x] Add `error.tsx`, `not-found.tsx`, `global-error.tsx`, canonical metadata, robots and sitemap.
- [x] Add Playwright with public journeys and axe on both legal pages.
- [x] Record ADR 0001 (identity linking) and ADR 0002 (deferred nonce CSP).

### Completion

- [x] Run format, lint, types, tests, migration journal, build and E2E.
- [x] Record the results in Validation.

## Files

- `docs/agent-kit/project-context.md` — approved contract and provenance.
- `AGENTS.md` — entry point and integration block.
- `next.config.ts` — static security headers.
- `lib/env.ts` — Zod environment validation.
- `e2e/public.spec.ts` — public browser journeys.
- `.github/workflows/app-ci.yml` — application CI.

## Decisions

- 2026-11-03 — Preserve npm, `app/` + `lib/`, Better Auth and the identity policy; adopt the kit as reference, not as a stack rewrite.
- 2026-11-03 — Keep `franja` and `runo` as domain/persisted vocabulary; see `docs/product/glossary.md`.
- 2026-11-03 — Ship static headers now; defer the nonce CSP with ADR 0002.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-03 | `npm test` | Passed | 410/410 tests, 40 files, isolated copy and real repo |
| 2026-11-03 | `npm run typecheck` | Passed | After `next typegen` |
| 2026-11-03 | `npm run lint` | Passed | `--max-warnings=0` |
| 2026-11-03 | `npm run format:check` | Passed | One mechanical normalization |
| 2026-11-03 | `npm run db:check` | Passed | No database connection |
| 2026-11-03 | `npm run build` | Passed | Synthetic loopback credentials |
| 2026-11-03 | `npm run test:e2e` | Passed | 9/9 Chromium; axe found no WCAG A/AA violations on legal pages |
| 2026-11-03 | Environment failures | Passed | Missing secret, missing production URL and non-loopback HTTP all failed closed |

## Log

- 2026-11-03 — Doctor against `3dd8ab1`: no P0, P1/P2 gaps in headers, CI, env, license, formatting and browser tests.
- 2026-11-03 — Baseline 410/410 tests, typecheck, lint, `db:check` and build before changes.
- 2026-11-03 — Adoption committed as `8e3be9a`; nothing pushed, migrated or deployed.
- 2026-11-04 — A later clean install rewrote `package-lock.json` without `resolved`/`integrity`; the restore is pending a commit and is listed in the Icebox.

## History

- [2026-11-03 STATUS snapshot](../archive/2026-11-03-status.md) — prior work-state log, preserved for context.
