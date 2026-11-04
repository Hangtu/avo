# 003 — E4.2 selective account sync

id: 003
updated: 2026-11-04

## Goal

Close E4.2: the owner accepts the sync corrections and UI, a real account
recovers its pending items in a second browser, and the authorized environment
is validated for recovery. Deployment needs its own authorization.

## Out of scope

- Deploying to production, applying migrations, or changing Vercel/Neon settings.
- New sync features, runtime sync of timers/sessions, or changing the identity policy.
- E4.1/E4.3.1 real-provider checks (tasks 004 and 005) and F01, which stay in the backlog.

## Next step

Owner reviews the sync corrections and UI. Then, in an authorized disposable
context, create → confirm → clear storage → sign in again and recover the
pending item in a second browser. Test Facebook in both orders. Record results
in Validation and Log. Do not deploy or migrate.

## Checklist

### Owner review

- [ ] Review local-only, quota/upgrade, conflict and no-JS notices on the real build.
- [ ] Confirm timer/session behavior when a remote change arrives while typing.

### Real recovery

- [ ] Create and confirm a pending item with a real Google account.
- [ ] Clear storage, sign in again in another browser and recover the item.
- [ ] Record the remote state of `development` with `db:verify` (read-only).

### Release

- [ ] Record the remote state of `development` and `prod` with `db:verify` (read-only).
- [ ] Deploy only after a separate authorization and a recovery point.
- [ ] Close this task with the guard passing.

## Files

- `components/account-workspace.tsx` — session selection, probe and sync loop.
- `lib/sync/client.ts` — outbox, bootstrap, ETag and recovery.
- `lib/sync/server-auth.ts` — session, account precondition and origin checks.
- `lib/sync/server-repository.ts` — account-scoped reads/writes and receipts.
- `docs/cloud/2026-11-02-selective-account-sync.md` — design and limits.
- `docs/cloud/2026-11-03-sync-review-corrections.md` — corrections and evidence.
- `docs/decisions/0001-identity-linking-by-provider-email.md` — linking policy.

## Decisions

- 2026-11-03 — The provider-delivered email identifies the account; no mailbox verification in the MVP (ADR 0001).
- 2026-11-03 — Only durable definitions, preferences and pending completion are portable; timers, sessions and recurring results stay local.
- 2026-11-03 — Guest data is incorporated only with consent, a summary and a recovery copy.
- 2026-11-04 — Work state moves to this board; `STATUS.md` is archived, not updated further.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-03 | `npm test` | Passed | 410/410 tests, 40 files; includes sync, conflict and isolation cases |
| 2026-11-03 | `npm run build` | Passed | Synthetic loopback credentials; no Neon |
| 2026-11-03 | `npm run test:e2e` | Passed | 9/9 public journeys; no authenticated account |
| 2026-11-03 | Google real session | Passed locally | 2 pending items and 3 receipts in Neon `development`; owner report |
| 2026-11-03 | Schema `development` / `prod` | Passed | 4 migrations and required schema; read-only verification |
| 2026-11-04 | Recovery in another browser | Not run | Needs the authorized environment and the owner |
| 2026-11-04 | Deploy | Not run | Requires separate authorization |

## Log

- 2026-11-02 — Pending-persistence incident investigated: the form wrote only to IndexedDB; no account bootstrap.
- 2026-11-02 — Account spaces, private API, atomic outbox, revisions/receipts, conflicts and consent-based import implemented.
- 2026-11-03 — Review corrections applied: idempotent selection, atomic preference patches, canonical hash, ETag ordering, blocked/timeout recovery.
- 2026-11-03 — `0003` applied in `development` with authorization; counts preserved. `prod` already had 4 migrations.
- 2026-11-03 — First real Google sign-in synced 2 pending items and 3 receipts in `development`.
- 2026-11-04 — Task board adopted; the old STATUS content is archived and this task is the resume point.
- 2026-11-04 — Scope trimmed to E4.2: the Facebook and provider-matrix checks live in tasks 004 and 005.

## History

- [2026-11-03 STATUS snapshot](../archive/2026-11-03-status.md) — detailed prior evidence, reviews and limits.
