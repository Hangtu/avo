# 003 — E4.2 selective account sync

id: 003
updated: 2026-11-09

## Goal

Close essential real acceptance for selective sync: the owner accepts the UI,
a pending item recovers in a second browser, consented guest import is safe, and
a completed one-time item stays terminal across recovery. Deployment needs its
own authorization.

## Out of scope

- Deploying to production, applying migrations, or changing Vercel/Neon settings.
- New sync features, runtime sync of timers/sessions, or changing the identity policy.
- E4.1/E4.3.1 real-provider checks (tasks 004 and 005) and F01, which stay in the backlog.

## Next step

Owner reviews the current sync UI and, in separately authorized `development`
with a disposable account, performs recovery and terminal-item acceptance.
Reconcile the legacy guest-import criterion with the owner-requested removal of
its Settings entry in 032 before attempting it; do not recreate that UI
automatically. Record results. Schema readiness is owner-confirmed; do not
recheck it, deploy, or migrate.

## Checklist

### Owner review

- [ ] Review local-only, quota/upgrade, conflict and no-JS notices on the real build.
- [ ] Confirm timer/session behavior when a remote change arrives while typing.

### Real sync acceptance

- [ ] Create and confirm a pending item with an authorized disposable Google account, clear storage, sign in in a second browser and recover it.
- [ ] Reconcile the legacy guest-import criterion with the owner first: the Settings entry was removed in task 032. If a separately approved entry is ever provided, cancel and confirm neither side changes; accept once and verify only intended data/preferences plus the recovery copy. This criterion is not passed by UI removal.
- [ ] Complete a one-time pending and confirm its terminal state survives recovery without duplicate or reopen.
- [ ] Confirm no unrelated account data appears; record the results.

### Completion

- [ ] Close this task after owner acceptance and the task guard pass.

## Files

- `components/account-workspace.tsx` — session selection, probe and sync loop.
- `lib/sync/client.ts` — outbox, bootstrap, ETag and recovery.
- `lib/sync/server-auth.ts` — session, account precondition and origin checks.
- `lib/sync/server-repository.ts` — account-scoped reads/writes and receipts.
- `docs/cloud/2026-11-02-selective-account-sync.md` — design and limits.
- `docs/cloud/2026-11-03-sync-review-corrections.md` — corrections and evidence.
- `docs/decisions/0001-identity-linking-by-provider-email.md` — linking policy.

## Decisions

- 2026-11-09 — Owner removed guest import and continue-as-guest actions from Settings in task 032. Existing guest import logic/consent constraints remain intact, but browser import acceptance has no current UI entry and needs product reconciliation before this task can close. Do not restore it automatically; recovery/terminal acceptance remains open and independently actionable.
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
| 2026-11-04 | Deploy | Not run | Remains separate from E4.2 and requires explicit authorization |

## Log

- 2026-11-09 — Recorded the owner-requested Settings UI removal from task 032 and clarified the legacy import criterion/next action. No real acceptance ran, no item was marked complete, and this task remains in backlog.
- 2026-11-02 — Pending-persistence incident investigated: the form wrote only to IndexedDB; no account bootstrap.
- 2026-11-02 — Account spaces, private API, atomic outbox, revisions/receipts, conflicts and consent-based import implemented.
- 2026-11-03 — Review corrections applied: idempotent selection, atomic preference patches, canonical hash, ETag ordering, blocked/timeout recovery.
- 2026-11-03 — `0003` applied in `development` with authorization; counts preserved. `prod` already had 4 migrations.
- 2026-11-03 — First real Google sign-in synced 2 pending items and 3 receipts in `development`.
- 2026-11-04 — Task board adopted; the old STATUS content is archived and this task is the resume point.
- 2026-11-04 — Scope trimmed to E4.2: the Facebook and provider-matrix checks live in tasks 004 and 005.
- 2026-11-04 — Paused in backlog while task 011 implements owner-approved hardening (M1, M3, M4, B1, B3). Next step and real-provider evidence remain unchanged; no remote operations authorized.
- 2026-11-05 — Owner confirms separate `development` and `prod` Neon databases with the same schema. Owner-shared `db:verify:prod` reports a complete schema and five applied migrations. Removed repeat schema checks and the duplicated Facebook identity matrix; real recovery remains open.
- 2026-11-05 — Consolidated essential real guest-import (E4.4) and terminal-completion (E4.5.1) acceptance here; local tests do not close these real-account checks.

## History

- [2026-11-03 STATUS snapshot](../archive/2026-11-03-status.md) — detailed prior evidence, reviews and limits.
