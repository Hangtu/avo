# Project Context

- **Status:** approved
- **Mode:** existing
- **Kit source:** https://github.com/Hangtu/agentic-nextjs-template
- **Kit revision:** 3dd8ab189c038111d714d73884151ca7b70ac01c
- **Adopted at:** 2026-11-03
- **Update policy:** manual-review
- **Knowledge root:** docs/agent-kit
- **Approval:** The owner approved the Doctor report and phases 0-3 of the adoption plan on 2026-11-03 (baseline, governance, CI, security and configuration). Phase 4 (browser tests) and phase 5 (debt) are recorded as deferred work; this contract does not authorize commits, deploys, migrations, or remote service changes.

This is the approved contract for Avo, an existing Next.js application. The
reference library lives in [`docs/agent-kit/`](./README.md) and is pinned to the
revision above. Absorbing the library does not authorize an application
migration, a stack replacement, or a new operation; Doctor, Adopt, and Verify
remain per-request operations.

## Product and compatibility

- Product brief: [`docs/product/brief.md`](../product/brief.md).
- Product contract and pending IDs: [`plan.md`](../../plan.md).
- Runtime state, evidence, and next action: [`tasks/README.md`](../../tasks/README.md)
  and completed local task [`012`](../../tasks/completed/012-postgres-resilience.md), following
  completed local hardening [`011`](../../tasks/completed/011-security-hardening.md).
- Observed stack: Next.js 16.4.3 (App Router, Turbopack, Cache Components,
  Partial Prefetching), React 19.3, TypeScript 5 strict, Tailwind CSS v4,
  next-intl 4, Dexie 4 (client persistence), Drizzle ORM 0.45 on PostgreSQL
  (Neon), Better Auth 1.7 with Google and Facebook providers, Vitest 4.
- Package manager: npm with `package-lock.json` (lockfile v3). Node.js is
  pinned in `.node-version`; CI reads that file.
- Compatibility with the reference library: **supported**. It is an App Router
  application inside the library's primary scope. The library's literal `src/`
  and pnpm examples are defaults, not requirements; Avo keeps `app/` + `lib/`
  and npm.
- Evidence boundary: local tests and builds do not prove Neon, OAuth providers,
  a real browser, a physical device, or the deployed environment.

## Capabilities

| Capability | State | Decision / evidence |
|---|---|---|
| ui | active | `app/` routes compose the deck, timer, settings, and legal pages from the root `components/` folder. |
| public-pages | active | `/`, `/privacy`, and `/data-deletion` are public and indexable; metadata lives in `app/layout.tsx`, `app/privacy/page.tsx`, and `app/data-deletion/page.tsx`. |
| forms | active | `components/quick-task-form.tsx`, `components/task-editor.tsx`, and the account controls submit data; account writes cross the boundary at `app/api/account/data/route.ts`. |
| database | active | Drizzle schema in `lib/db/schema.ts` and `lib/db/auth-schema.ts`; migrations in `drizzle/`; Neon PostgreSQL via `DATABASE_URL`. |
| auth | active | Better Auth in `lib/auth.ts`; session and ownership checks in `lib/sync/server-auth.ts`; per-account isolation in `lib/sync/server-repository.ts`. |
| i18n | active | ES/EN catalogs in `messages/`, configuration in `lib/i18n/config.ts`, client provider in `components/i18n-provider.tsx`. |
| url-state | inactive | Shareable filter/pagination state does not exist. The only URL parameter is the transient OAuth `?error=` notice, which is read and removed (`lib/platform/auth-callback-error.ts`). |
| analytics | inactive | No third-party analytics or LLM calls by product decision (`plan.md`, "Fuera de alcance"). |
| shared-cache | active | `next.config.ts` enables Cache Components and Partial Prefetching. Only public, non-permission-dependent pages are prerendered; account data is served with `private, no-store`. |
| external-api | active | Private HTTP contract at `/api/account/me` and `/api/account/data` (origin, JSON, size, idempotency, ETag) consumed by the browser client in `lib/sync/client.ts`. |

States are onboarding decisions, not runtime flags. `inactive` means "not needed
in the agreed scope", not "forbidden".

## Conventions

- Instruction entry point: [`AGENTS.md`](../../AGENTS.md). The adoption block at
  the end points back to this contract.
- Routes: `app/` is routing only (pages, layouts, route handlers, metadata,
  error/not-found boundaries). It composes UI from `components/` and calls
  `lib/`; it holds no domain rules.
- UI: the root `components/` folder owns app UI. Server Components are the
  default; `"use client"` marks the smallest interactive leaf. `lib/ui/` holds
  pure layout/selection logic with no JSX.
- Domain and data: `lib/domain/` (pure rules), `lib/db/` (Dexie and Drizzle
  schema/repositories), `lib/sync/` (protocol, client, server repository,
  authorization), `lib/platform/` (browser capabilities), `lib/i18n/`.
- Configuration: `lib/config/site.ts` (canonical origin and site name) and
  `lib/config/routes.ts` (public routes, shared by the sitemap and robots).
  Secrets stay in `lib/env.ts`; never add server values to `lib/public-env.ts`.
- Dependency direction: `app/` → `components/` → `lib/`; `lib/` must never
  import `app/`. ESLint enforces the last rule. Tests that exercise a route,
  page, or component boundary live in `tests/`, not inside `lib/`.
- Server-only modules start with `import "server-only"` (`lib/db/client.ts`,
  `lib/auth.ts`, `lib/sync/server-auth.ts`).
- Database schema: `lib/db/schema.ts` and `lib/db/auth-schema.ts`. Generated SQL
  and the journal live in `drizzle/` and are never hand-edited.
- Decision records: `docs/decisions/` (application ADRs). The adopted library's
  own ADRs stay under `docs/agent-kit/architecture/decisions/` as reference
  material and are not decisions about Avo.
- Technical notes and incident records: `docs/cloud/`. Design references:
  `docs/design/`. Product brief: `docs/product/brief.md`. Vocabulary and the
  `franja`/`runo` exceptions: `docs/product/glossary.md`.
- Tests: `lib/**/*.test.ts` next to domain/data code; component tests in
  `components/**/*.test.tsx`; route/page/boundary tests in `tests/`; browser
  journeys in `e2e/*.spec.ts`.
- Work state: `tasks/` is the board. `tasks/README.md` holds the index and
  conventions; each task holds the goal, scope, next step, checklist and
  evidence. `scripts/check-tasks.mjs` validates the board (`npm run check:tasks`).
  Do not duplicate work state in the conversation or a second status file.
- Local storage keys and database names keep the `runo` prefix on purpose;
  renaming them would orphan existing user data (`plan.md`).
- Tools to preserve: npm, ESLint flat config (`eslint.config.mjs`), Prettier
  (`.prettierrc.json`; Markdown is hand-authored and ignored), Vitest, Drizzle
  Kit, Playwright for E2E, Tailwind v4 through `@tailwindcss/turbopack`.
- Safe example to mirror: an account write goes UI → `lib/sync/client.ts` →
  `app/api/account/data/route.ts` → `lib/sync/server-auth.ts` →
  `lib/sync/server-repository.ts`, with the mutation validated at the boundary.

## Verification

| Check | Command | Baseline / result |
|---|---|---|
| Unit/integration tests | `npm test` | 410/410 passing, 40 files, on 2026-11-03 (`2d004de`, isolated copy) |
| Types | `npm run typecheck` | Passing on 2026-11-03 |
| Lint | `npm run lint` | Passing on 2026-11-03 |
| Formatting | `npm run format:check` | Passing on 2026-11-03 after the one-time normalization |
| Migration journal | `npm run db:check` | Passing on 2026-11-03 (no connection) |
| Production build | `npm run build` | Passing on 2026-11-03 with synthetic loopback `DATABASE_URL` and a disposable secret |
| Database connectivity | `npm run db:health` / `npm run db:health:prod` | Read-only; requires local `.env` / `.env.prod` (never committed) |
| Schema verification | `npm run db:verify` / `npm run db:verify:prod` | Read-only; requires local `.env` / `.env.prod` |
| Task board | `npm run check:tasks` | Passing on 2026-11-04; `npm run test:tasks` covers the guard itself |
| Browser journeys | `npm run test:e2e` | 9/9 passing on 2026-11-03 (Chromium, production build); public surfaces only, axe reports no WCAG A/AA violations on both legal pages. No authenticated account, Neon, or provider login. |

`npm run db:migrate` and `npm run db:migrate:prod` write to a database. They are
never part of a routine check and require explicit owner authorization, a
reviewed migration, and a recovery point. Build and tests use synthetic
credentials; they do not validate Neon, OAuth, a real browser, or a device.

## Deferred work

- Authenticated E2E: sign-in, account isolation, and recovery require an
  authorized environment and test identity; not covered by the public E2E suite.
- CSP: static report-only now diagnoses scripts/styles/origins. Enforcement is
  deferred pending theme, curtain/motion, PWA/offline and real OAuth measurement.
  The installed Next guide makes nonce CSP incompatible with PPR; preserve
  Cache Components/Partial Prefetching. See amended ADR 0002.
- Oversized modules: `components/task-editor.tsx` (~1.6k lines),
  `lib/db/repository.ts` (~1.5k), and `components/runo-home.tsx` (~1.4k)
  exceed the library's soft limits and need characterization tests before any
  split.
- Security headers include the static set and a strict static report-only CSP
  in `next.config.ts`; HSTS remains a real-domain check. No CSP enforcement is
  claimed. Rationale: [ADR 0002](../decisions/0002-defer-nonce-csp.md).
- Owner-approved B3 (2026-11-04): `AVO_DEV_HOSTS` replaces the hardcoded LAN
  address with exact, opt-in hostnames (development only). Private `.env` was
  not edited; the owner must set the current LAN hostname and restart dev.
- Owner-approved M1/M3/M4: new account writes omit OAuth tokens; rate limits
  use HMAC-keyed atomic expiring PostgreSQL counters. Generated migration 0004
  is not applied remotely: auth/account fail closed until authorized activation.
  Historical-token cleanup is separate. npm 11.11.0 installs with all dependency
  scripts disabled, integrity-checked lock and a CI high/critical audit gate.
  See [hardening record](../cloud/2026-11-04-security-hardening.md).
- Open product blockers remain E4.2, E4.3.1, E4.8, and F01 in `plan.md`. Legal
  controller name/address and support-mailbox monitoring are still unconfirmed.
- `docs/agent-kit/` is a pinned copy. Update it only through
  [`docs/agent-kit/playbooks/update-kit.md`](./playbooks/update-kit.md) with
  three-way review; never auto-sync.

## Current work

- Local task **012** completed the approved PostgreSQL resilience review and
  real-session verification. No next task starts automatically. No Neon access
  or application migration is authorized. Local hardening **011** is complete
  ([evidence](../../tasks/completed/011-security-hardening.md)); E4.2 is paused in
  [`tasks/backlog/003-e4-2-selective-account-sync.md`](../../tasks/backlog/003-e4-2-selective-account-sync.md)
  and
  [`docs/cloud/2026-11-02-selective-account-sync.md`](../cloud/2026-11-02-selective-account-sync.md).
- Last local verification (2026-11-04, task 012): 472/472 tests, typecheck,
  lint, format, journal/guards, isolated production build and 10/10 public
  Chromium journeys, plus **6/6 independent-connection tests on PostgreSQL 17.11**
  in an owner-approved loopback-only disposable container. The owned container
  and credential were removed; other workloads were untouched. No app dependency
  or lock edits; install/audit/signature evidence remains in task 011. No remote
  CI/Neon/PgBouncer/OAuth/device evidence.
- Next concrete step: separately authorize application migration 0004 activation,
  with a confirmed destination/recovery point; auth/account fail closed without it.
  Local verification of task 012 is complete; no new task starts automatically.
  Historical-token cleanup and CSP enforcement remain gated. E4.2 resumes with
  owner review of the sync corrections, then the authenticated matrix (Google and Facebook in both orders, missing email,
  different email) in the authorized environment. No deploy or production
  migration is authorized by this contract.
