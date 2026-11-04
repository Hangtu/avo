# 008 — Authenticated E2E

id: 008
updated: 2026-11-04

## Goal

Add a Playwright setup project that signs in with a disposable test identity,
reuses `storageState`, and covers create → confirm → recover, account isolation,
and axe on the authenticated app pages without real user data.

## Out of scope

- Using the owner's account, production data or a real provider login in CI.
- Replacing the public journeys that already exist.

## Next step

Add a setup project with a disposable test identity and saved `storageState`.
Cover create → confirm → recover and A/B isolation, then run axe on the app
pages. Keep public tests separate and deterministic. Document the required
test-only environment.

## Checklist

- [ ] Provision a disposable test identity and test-only environment.
- [ ] Add the Playwright setup project and `storageState`.
- [ ] Cover create → confirm → recover.
- [ ] Cover account A / account B isolation.
- [ ] Run axe on the authenticated pages.
- [ ] Gate CI only after the environment exists.

## Files

- `playwright.config.ts` — projects and web server.
- `e2e/public.spec.ts` — current public coverage.
- `lib/sync/server-auth.ts` — session boundary to exercise.
- `lib/sync/server-repository.ts` — account-scoped reads/writes.
