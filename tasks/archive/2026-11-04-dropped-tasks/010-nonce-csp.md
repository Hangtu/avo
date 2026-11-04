# 010 — Nonce CSP

id: 010
updated: 2026-11-04

## Goal

Move from static security headers to a measured nonce-based Content Security
Policy: add `proxy.ts`, start in report-only, verify the theme bootstrap, the
loading curtain, the service worker and OAuth redirects, then enforce it and
update ADR 0002.

## Out of scope

- Enforcing a policy without measurements.
- Adding a permissive `unsafe-inline` script policy.

## Next step

Add `proxy.ts` with a report-only nonce policy and collect violations from the
theme bootstrap, loading curtain, service worker and OAuth redirects. Fix or
document each violation, then enforce and update ADR 0002. Do not make pages
dynamic without measuring the cost.

## Checklist

- [ ] Add `proxy.ts` with a report-only nonce policy.
- [ ] Exercise theme boot, curtain, service worker and OAuth.
- [ ] Resolve or document every violation.
- [ ] Enforce the policy and measure the rendering cost.
- [ ] Update ADR 0002 and the contract.

## Files

- `next.config.ts` — current static headers.
- `docs/decisions/0002-defer-nonce-csp.md` — deferral rationale.
- `components/loading-curtain.tsx` — inline styles and early paint.
- `lib/domain/theme-boot.ts` — inline theme script.
