# 032 — Simplify account sync actions

id: 032
updated: 2026-11-09

## Goal

Settings no longer offers “Continuar sin cuenta” or “Revisar datos del invitado” in AccountSyncPanel. Show the general connection retry action only for an available account workspace in error status; healthy, syncing, offline, expired, guest and local-preference-only states do not offer that action. Preserve logout, notices and per-item recovery controls, with no empty healthy panel or action row.

## Out of scope

- Changing login/logout behavior, auth policy, data isolation, sync scheduling/retries or backend/API/storage behavior.
- Removing guest data or the lower-level consent-based import module/tests; automatic guest import is forbidden.
- Removing the separate continue-as-guest action in startup/storage recovery, local-save retries or conflict/rejected-item recovery.
- Dependencies/configuration, real Neon/OAuth/account operations, migrations, commit, push or deploy.

## Next step

Owner may review the simplified signed-in Settings panel in their browser. Implementation and local validation are complete; publication, real account operations and manual/device acceptance remain separate. Legacy import acceptance reconciliation stays with backlog task 003.

## Checklist

- [x] Execute failing tests for removed guest actions, error-only connection retry, healthy silence and preserved recovery controls in ES/EN.
- [x] Simplify only the Settings sync panel, remove unreachable import-preview handlers/state and preserve task 031's success-notice change.
- [x] Preserve logout, startup recovery, local-save and per-item recovery actions; no data or auth-state change.
- [x] Update the sync UI note and flag the now-unavailable guest-import acceptance step in existing task 003 without claiming it passed or reintroducing UI.
- [x] Run focused/full tests, dependency policy/tests, types, lint, format, journal/task guards, isolated production build and existing public browser journeys.
- [x] Review scope/preservation, record evidence and external/manual limits, close the task and validate the board.

## Files

- `components/account-sync-panel.tsx` — Settings actions, notices and recovery.
- `components/account-sync-panel.test.tsx` — prior task 031's 28 regressions, preserved unchanged.
- `components/account-sync-actions.test.tsx` — 32 Settings action/control rendering regressions in ES/EN.
- `components/account-control.tsx` — existing logout, left unchanged.
- `components/workspace-fallback.tsx` — startup guest recovery, left unchanged.
- `tasks/backlog/003-e4-2-selective-account-sync.md` — legacy import acceptance affected by UI removal.
- `docs/cloud/2026-11-02-selective-account-sync.md` — sync UI behavior and historical evidence.

## Decisions

- 2026-11-09 — Owner explicitly requested removing both guest-related Settings actions and showing general connection retry only after a cloud-backup failure. Use existing error status, not an invented failure flag or new sync behavior. Offline reconnection and expired-session recovery remain unchanged.
- 2026-11-09 — Remove the Settings-only import UI/handlers rather than leave an unreachable flow. Keep the isolated lower-level import implementation and its consent/rollback tests; never import or clear data as part of this UI change.
- 2026-11-09 — Preserve pending task 031 work on main (`f266c97`), including its healthy-saved predicate and existing regression file. Prior regression file SHA-256: `3b91f9ad6fa2f2b568965a560e5c817cfeab4a4f4ff6c86ca5d852f6de25b0ab`; task 031 record: `45fa1861bfad285cd8e816cf0a5c27e3d54c7984d8e8b70b52202c0c90d324e2`.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-09 | Read-only orientation | Passed | No active task. Prior 031 changes are unstaged; no other staged work. Located the exact Settings row and separate logout/startup-recovery controls. No real account/browser data accessed. |
| 2026-11-09 | Action regression red phase | Failed as expected | Before implementation: 24 failing action/healthy/recovery cases, 6 passing guards. Synthetic context only; `/tmp/avo-sync-actions-red.log`. |
| 2026-11-09 | Focused component render tests | Passed | 60/60 in two files: 28 prior notice regressions plus 32 new ES/EN action/control cases, including a separate sign-out button with the session boundary mocked. No actual login/logout, account network, cookies or browser backup tested. |
| 2026-11-09 | Isolated `npm run verify` | Passed | 643 tests / 59 files, 4 dependency-policy tests, typecheck, zero-warning lint, format, journal and task guard. Evidence: `/tmp/avo-account-actions-check.6102CK/evidence/verify.log`. |
| 2026-11-09 | Task-guard regressions | Passed | 41 tests / 8 suites; `evidence/task-tests.log` in the same isolated directory. |
| 2026-11-09 | Isolated production build | Passed | Next 16.4.3, 13 static pages and generated service worker; Cache Components/PPR preserved. Synthetic loopback config; `evidence/build.log`. |
| 2026-11-09 | Existing public Chromium journeys | Passed | 31/31 after build; `evidence/e2e.log`. Guest/public surfaces only. Refused-loopback account probes/local Better Auth warning are expected fixture signals, not production findings. |
| 2026-11-09 | Final scope and preservation | Passed | Both baseline 031 hashes unchanged; no diff in auth/logout/startup recovery, app/lib/domain, catalogs, dependencies/lock, migrations or CI. Tested component/test source matches the working copy; whitespace clean; no staged changes. |
| 2026-11-09 | Real account/manual/device acceptance | Not run | No live localhost:3000 account/cookie inspection, real Neon/OAuth/login/logout/import, signed-in browser, physical device or screen-reader run. Component cases use synthetic context/session boundary; public E2E does not prove cloud backup. |

## Log

- 2026-11-09 — Full verification, production build and all 31 existing public Chromium journeys passed in `/tmp/avo-account-actions-check.6102CK/repo`, using a clone of the prior script-disabled Node 26 dependency install with matching lockfile/@types/node 26.6.6. Synthetic configuration only; no private env file, working dependency reinstall or development `.next` overwrite.
- 2026-11-09 — Two-axis final review confirms requested actions removed/error-gated with logout and per-item/local recovery intact; domain/auth/API/CI/dependencies/catalogs unchanged. Prior 031 regression/task hashes match baseline; tested component source matches working source. The only discovery (legacy import browser acceptance) is routed to 003, without falsely closing it. Closing this implementation without commit/push/deploy or real account operations.
- 2026-11-09 — Removed Settings guest actions and all now-unreachable import UI/handlers/state/imports. Existing error status gates the general retry; a shared pure notice predicate avoids an empty healthy panel without changing warning priority. All local/per-item recovery and separate logout controls are preserved.
- 2026-11-09 — Routed the unavailable legacy guest-import browser criterion to existing backlog task 003 and updated the owning sync note; no broader product acceptance was closed and no new flow is authorized.
- 2026-11-09 — Saved the approved UI plan before code changes. Old guest-import browser acceptance in 003 must be reconciled with the removed entry point, not silently closed or treated as authorization to restore it.
