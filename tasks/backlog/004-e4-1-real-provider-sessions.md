# 004 — E4.1 real provider sessions

id: 004
updated: 2026-11-05

## Goal

Prove the real session lifecycle with Google in the authorized deployed
environment: sign-in, explicit logout and revocation without leaking another
account's cache. Also verify the retired E3 routes/configuration are absent from
the target release (E4.7). Facebook local is already confirmed by the owner.

## Out of scope

- E4.2 recovery and E4.3.1 linking matrix.
- New providers, password accounts or production data changes.

## Next step

In the authorized deployed environment, sign in with Google and log out
explicitly; confirm revocation, cache isolation, and absence of retired E3
routes/configuration. Record the evidence here. Do not deploy or change production
data without separate authorization.

## Checklist

- [ ] Sign in with Google in the deployed environment.
- [ ] Log out and confirm remote revocation.
- [ ] Open a second tab with a different account; confirm isolation.
- [ ] Repeat after an offline reload.
- [ ] Read-only check that retired E3 routes/seed configuration are absent from the target release (E4.7).
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

## Decisions

- 2026-11-05 — Includes E4.6 session/cache isolation and a read-only E4.7 check for retired E3 routes/configuration in the authorized release; this does not authorize deployment or production changes.
