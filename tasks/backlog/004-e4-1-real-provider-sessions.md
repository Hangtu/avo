# 004 — E4.1 real provider sessions

id: 004
updated: 2026-11-04

## Goal

Prove the real session lifecycle with Google in the authorized deployed
environment: sign-in, explicit logout and revocation, without leaking another
account's cache. Facebook local is already confirmed by the owner.

## Out of scope

- E4.2 recovery and E4.3.1 linking matrix.
- New providers, password accounts or production data changes.

## Next step

Sign in with Google in the authorized deployed environment, then log out
explicitly. Confirm the session is revoked, the local cache is isolated and no
other account's data appears. Record the evidence here. Do not deploy without
authorization.

## Checklist

- [ ] Sign in with Google in the deployed environment.
- [ ] Log out and confirm remote revocation.
- [ ] Open a second tab with a different account; confirm isolation.
- [ ] Repeat after an offline reload.
- [ ] Record evidence and close.

## Files

- `lib/auth.ts` — Better Auth configuration and providers.
- `components/account-control.tsx` — sign-in and logout UI.
- `lib/sync/access.ts` — space selection, lock and revocation.
- `docs/cloud/2026-11-02-e4-auth-and-spaces.md` — auth decisions.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-03 | Google local sign-in | Passed | Owner confirmed a real local login; logout still pending |
| 2026-11-03 | Facebook local | Passed | Owner confirmed |
| 2026-11-04 | Deployed session/logout | Not run | Needs authorization and the deployed environment |
