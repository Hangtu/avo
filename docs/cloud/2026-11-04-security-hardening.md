# Security hardening — 2026-11-04

Owner-approved scope: M1, M3, M4, B1, B3. Work state and verification:
[completed local task 011](../../tasks/completed/011-security-hardening.md). No deployment, remote
migration, credential access, identity-policy change or historical-data rewrite
is authorized by this implementation.

Follow-up: [PostgreSQL resilience](2026-11-04-postgres-resilience.md) supersedes
counter saturation/cleanup frequency and adds SQL budgets, direct migration guards
and consistent aggregate ETags. The original implementation evidence remains below.

## Threat model and abuse cases

- OAuth callback → account persistence: provider tokens are sensitive credentials;
  a DB reader/backup reader should not obtain reusable external API access.
- Public auth/probe and authenticated account requests → PostgreSQL: repeated or
  concurrent requests must not bypass counters by reaching different instances,
  spoofing account IDs or changing untrusted forwarded IP headers.
- Dependency registry → developer/CI machine: a malicious lifecycle hook must
  never execute merely because a lockfile changed; altered bytes must fail SRI.
- Server HTML → browser: diagnose unexpected scripts/styles/origins without
  breaking PPR, the theme, motion, offline service worker or OAuth redirects.
- LAN configuration → Next dev: only explicit hostnames grant dev asset access;
  HMR permission does not grant account mutation/auth permission.

## M1 — no unnecessary provider token retention

`lib/auth.ts` overrides account create/update writes with **null** for
accessToken, refreshToken, idToken, their expiries and scope. Undefined would not
clear existing columns on update. Provider/user/account IDs and Better Auth's
own session remain unchanged. `storeAccountCookie` is explicitly false.

The installed Better Auth 1.7.15 routes write idToken directly on several paths;
`encryptOAuthTokens` alone would not cover all three token types despite its
option documentation. Avo has no post-login provider API consumer, so retention
is unnecessary. Synthetic integration tests use the real internal adapter and
PGlite to inspect stored columns and create a session.

This does **not** erase pre-existing tokens, backups or logs. A subsequent
account write clears that row, but dormant accounts can retain historical
values. A separately authorized cleanup must confirm environment/recovery point,
clear only token columns, and address backup retention. Do not claim M1 is
retrospectively complete or rotate the session secret as a cleanup substitute.

## M3 — shared, atomic abuse limits

Generated additive migration `0004_security_rate_limits.sql` creates only
`runo_rate_limits` and its expiry index/checks. No account/domain data changes.
Apply it in a separately authorized environment **before running this code**;
until then auth/account endpoints return generic 503 (fail closed), not unlimited
traffic. Guests and static public pages do not depend on the limiter.

`db:verify` now requires the three counter columns, but was not run against
any environment in this work. The existing 0000–0003 evidence is historical and
does not validate migration 0004.

The store uses atomic PostgreSQL UPSERT, the database clock and fixed windows
anchored to the first request; denied requests do not extend expiry. Counters
saturate at max+1. This closes read-then-increment and per-instance bypasses.

| Scope | Budget | Identity |
|---|---|---|
| Auth general | 120 / minute | trusted IP or fallback; paths sharing a rule share a bucket |
| Social sign-in | 10 / 15 minutes | trusted IP or fallback |
| OAuth callbacks | 20 / 15 minutes | trusted IP or fallback |
| Account API (including anonymous probe) | 240 / minute | trusted IP or fallback, before session lookup |
| Session probe | 120 / minute | authenticated user |
| Account bootstrap/read | 60 / minute | authenticated user |
| Account mutations | 30 batches / minute | authenticated user; each batch still ≤40 mutations /512 KiB |

Better Auth keeps its other built-in stricter special rules. All throttled HTTP
responses use 429, `Retry-After`, a generic body and `private, no-store`.
Outages/missing schema return 503 without store details. Sync treats 429 as
transient: the outbox must stay queued, never permanently reject it.

Only when platform variable `VERCEL=1` is set do we trust Vercel's overwritten
`x-vercel-forwarded-for`. Arbitrary `x-forwarded-for` is ignored. Better Auth
validates IPs, rejects ambiguous chains, normalizes IPv4-mapped addresses and
collapses IPv6 to /64. Missing/invalid IPs use a shared fallback bucket rather
than bypassing limits. Other hosting needs an explicit trusted-proxy review;
do not set VERCEL by hand or trust arbitrary incoming headers. Confirm this
header contract in the actual deployment; local tests do not prove it.

Counter keys are HMAC-SHA256 with a purpose prefix and the existing server
secret. These are pseudonymous abuse-control identifiers, not anonymous
analytics. No raw IPs/account IDs or request bodies are stored/logged. Expiry is
≤15 minutes; each request prunes up to 100 expired keys with indexed selection
and skip-locked row locks, rechecking expiry to avoid deleting a concurrent
reset. With no traffic, expired rows wait for the next request; a hard wall-clock
physical deletion SLA would need separately approved scheduled maintenance.
They never enter account sync/export. This is separate from existing session
IP/user-agent retention and does not close B2/F01.

## M4 — npm trust boundary

- npm remains **11.11.0**, lockfile v3; no manager or package-version upgrades.
- `.npmrc` blocks every dependency lifecycle script and pins the public registry.
  There are **zero approved rebuild scripts**, not a broad package allowlist.
- Reviewed existing installer entry points: esbuild (three locked versions)
  selects/downloads its optional platform binary; @swc/core checks native/wasm
  bindings; @parcel/watcher can invoke node-gyp; unrs-resolver invokes
  napi-postinstall. None is needed on the verified platform when optional native
  packages are installed. Do not use `--omit=optional`. If another platform
  needs a build, review exact source/version and approve only that script first.
- Every CI install pins npm, runs `check:dependencies`, installs with
  `npm ci --ignore-scripts`, then rejects lockfile drift. Audit uses
  `npm audit --package-lock-only --audit-level=high` against the authoritative
  lock, not an installed-tree-only view. Migration credentials are exposed only
  to the confirmation/migration steps, not installation or audit.
- The dependency guard checks manifest/lock agreement, exact resolved versions,
  SRI hashes, registry restrictions and the effective script policy. npm itself
  verifies SRI when fetching packages. A native audit is not a malware detector.
- Missing lock SRI was restored using npm's native v3→v1→v3 metadata repair in an
  isolated directory. Existing package versions stayed fixed. npm added six
  missing optional WASI transitive placements; those platform-only dependencies
  were reviewed with the generated lock. Some registry URLs remain implicit in
  npm's output; exact versions + SHA512 + pinned registry still freeze the bytes.
  No lockfile field was hand-edited and no force remediation was used.

### Moderate advisory deferrals

Recheck **2026-11-18**, and before release. Do not use `audit fix --force`.

- esbuild ≤0.24.2 via Drizzle Kit's legacy @esbuild-kit loader: the advisory
  targets esbuild's dev server. This app does not expose that server. **Four
  moderates also remain in `npm audit --omit=dev`**: Better Auth brings this
  tooling chain into the production dependency graph. The vulnerable dev-server
  operation is not invoked by Avo's auth/sync routes, but DB tooling/build paths
  still need review; "dev-only" is not a valid blanket dismissal. Keep tools
  local and review a compatible upstream fix rather than downgrading core tools.
- minimatch via TypeScript ESLint/eslint-config-next: malicious glob input can
  cause excessive work. Lint inputs/config are reviewed repository content, not
  public HTTP input. Review upstream fixes; npm's forced Next config downgrade
  is not an acceptable automated fix.

Local native signature verification after a clean install: **516 packages**
with verified registry signatures, **161** with verified attestations. This is
installed-platform evidence, not a claim about every optional binary on all OSes.

High/critical advisories block CI. Any later advisory requires reachability
triage across runtime, build, tests and deploy, not just `--omit=dev`.

## B1 — CSP measurement, not false enforcement

See [ADR 0002](../decisions/0002-defer-nonce-csp.md). A static strict
`Content-Security-Policy-Report-Only` is set on all responses. No nonce/proxy,
`unsafe-inline` allowance or experimental SRI flag is added. Eval/websocket
exceptions exist only in development. Existing enforcement headers remain.

Expected reports include Next inline bootstrap, the theme script, loading
curtain/motion styles, and provider avatar hosts. Reports are visible in browser
DevTools / `securitypolicyviolation`; no reporting endpoint, telemetry vendor,
source samples, URL/body collection or network reporting is configured.

Before enforcement, inspect a production build in a real browser/device:

1. Capture directive/disposition summaries (no user data, URLs or script samples).
2. Exercise initial load, dark/auto theme, curtain, timer/motion, install/offline,
   and Google/Facebook redirects in an authorized test environment.
3. Choose a reviewed static/hash strategy compatible with the generated Next
   inline scripts, or separately approve changing the rendering contract.
4. Enforce only after clean measurements and owner acceptance. Public Playwright
   proves header delivery and report-only behavior, **not** production XSS blocking
   or authenticated OAuth/offline compatibility.

## B3 — explicit local LAN opt-in

Set `AVO_DEV_HOSTS` in private `.env` to exact hostnames/IPs without scheme, port
or wildcards, then restart next dev. It defaults to empty and is ignored outside
development. Example: `AVO_DEV_HOSTS="192.0.2.10"` (replace with your own LAN IP).
For OAuth/account writes, configure `AVO_DEV_AUTH_ORIGINS` separately with full
origins and register exact provider callbacks. This work does not read/write
private `.env` or change provider settings; the old LAN allowlist is no longer
a hardcoded fallback.
