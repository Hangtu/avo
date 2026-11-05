# 0002. Ship static security headers now and defer a nonce CSP

- **Status:** Accepted; amended 2026-11-04 (owner-approved B1)
- **Date:** 2026-11-03
- **Deciders:** Owner (adoption approval), implementation review

## Context

The app had no response security headers. The reference library asks for a
nonce-based `Content-Security-Policy` (SEC-21) set from `proxy.ts`, and also for
`nosniff`, a referrer policy, a permissions policy, COOP, and no framework
banner (SEC-22/23).

A nonce CSP has real costs here: it makes every page dynamic (the app currently
prerenders `/`, `/privacy`, `/data-deletion`, `/robots.txt`, and `/sitemap.xml`),
and the app injects an inline theme bootstrap script
(`lib/domain/theme-boot.ts`), a loading curtain, and a service worker. Those
need measurement against the policy before enforcing it.

## Decision

We will ship the static header set in `next.config.ts` now
(`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`, `poweredByHeader: false`,
`X-Robots-Tag: noindex` for `/api/*`, and HSTS in production).

We will **not** add a nonce-based CSP. The installed Next.js 16.4.3 guide
explicitly says that nonce CSP is incompatible with Partial Prerendering;
Cache Components and Partial Prefetching remain part of the product contract.

Amendment 2026-11-04: ship a **static strict report-only policy** via
`next.config.ts` / `lib/config/security.ts`. It starts at `default-src self`,
with strict script/style directives and explicit object/base/frame/form/worker
restrictions. No unsafe-inline relaxation, nonce, proxy or rendering change.
Development alone permits eval/websockets. This diagnoses violations; it does
not enforce CSP or claim XSS prevention. Browser console/events are the report
channel; no URL/script samples are collected or sent to a reporting service.

## Consequences

- **Positive:** framing, MIME sniffing, referrer leakage, and device permissions
  are constrained today without changing rendering or caching behavior.
- **Negative / trade-offs:** inline script injection is not restricted by a CSP
  yet; `X-Frame-Options` is the only anti-framing control.
- **Follow-up work:** measure the production static report-only policy against
  Next inline scripts, theme, loading curtain/motion, service worker/offline and
  authorized OAuth redirects. Choose a tested hash/static enforcement strategy,
  or separately approve changing the rendering contract. Do not add nonces that
  cannot reach the static shell. Re-evaluate HSTS on the real domain.
- Measurement/rollout instructions: [2026-11-04 hardening](../cloud/2026-11-04-security-hardening.md).

## Alternatives considered

| Option | Why not |
|---|---|
| Enforce a nonce CSP immediately | Makes pages dynamic and risks breaking the theme script, curtain, and service worker without measurement. |
| Add a broad `script-src 'unsafe-inline'` policy | Provides little protection while implying CSP coverage that does not exist. |
| Do nothing | Leaves clickjacking, MIME sniffing, and permission prompts unconstrained. |

## Enforcement

`next.config.ts` holds the static set; `e2e/public.spec.ts` asserts the headers
and the absence of `x-powered-by` on a production build. Public E2E also proves
an inline script runs while a report-only violation is emitted. Enforcement
remains deferred in the project contract; there is no CSP-based blocking yet.
