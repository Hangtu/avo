# 0002. Ship static security headers now and defer a nonce CSP

- **Status:** Accepted
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

We will **not** add a nonce-based CSP in this change. It is deferred until the
theme bootstrap, the loading curtain, the service worker, and OAuth redirects
have been measured against a report-only policy.

## Consequences

- **Positive:** framing, MIME sniffing, referrer leakage, and device permissions
  are constrained today without changing rendering or caching behavior.
- **Negative / trade-offs:** inline script injection is not restricted by a CSP
  yet; `X-Frame-Options` is the only anti-framing control.
- **Follow-up work:** add `proxy.ts` with a report-only nonce policy, measure,
  then enforce. Record the result here and update the contract. Re-evaluate HSTS
  settings when `avo.frutit.app` is configured.

## Alternatives considered

| Option | Why not |
|---|---|
| Enforce a nonce CSP immediately | Makes pages dynamic and risks breaking the theme script, curtain, and service worker without measurement. |
| Add a broad `script-src 'unsafe-inline'` policy | Provides little protection while implying CSP coverage that does not exist. |
| Do nothing | Leaves clickjacking, MIME sniffing, and permission prompts unconstrained. |

## Enforcement

`next.config.ts` holds the static set; `e2e/public.spec.ts` asserts the headers
and the absence of `x-powered-by` on a production build. The deferred CSP is
listed in the contract's deferred work.
