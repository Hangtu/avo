# 025 — Edit pending items

id: 025
updated: 2026-11-06

## Goal

From the one-off pending list, edit an active pending's title and duration, with changes persisted locally and included in account sync. Preserve the pending's identity and completion/removal state; do not allow editing while its timer is active.

## Out of scope

- Recurring task definitions or completed/removed pending items.
- Changing timer/session snapshots, history, rewards, or pending sync policy.
- Schema migrations, dependencies, auth changes, remote database checks, or deployment.

## Next step

Owner: review the edit flow in the actual browser/device, including light/dark presentation; then record acceptance and close the task after validating the board.

## Checklist

### Editing behavior

- [x] Add `updatePending` with existing validation, terminal-state checks, active-session protection, and atomic outbox enqueue; cover valid, invalid, missing, completed/removed, and active-session cases.
- [x] Add an Edit menu item; prefill title/minutes, support save/cancel, retain form data on failure, and announce success in Spanish and English.
- [x] Add a Playwright browser journey in `e2e/pending-edit.spec.ts` for opening, saving, and cancelling edits; verify the existing done/remove actions remain available.

### Completion

- [x] Run tests, typecheck, lint, format, database journal and task checks; run build/public E2E only from an isolated copy so the owner's `.next` is preserved.
- [x] Verify keyboard activation/focus and no horizontal overflow at 320px in dark theme; record that automation does not prove the owner's real browser/device.
- [ ] Owner: visually review the flow in the actual browser/device and confirm light/dark presentation before closing.
- [x] Review the final diff and record evidence; no migration, dependency, config, or unrelated source changes were introduced.
- [ ] After owner visual acceptance, close the task and validate the board.

## Files

- `components/pending-view.tsx` — edit menu, prefilled form, and save/cancel flow.
- `lib/db/repository.ts` — validated atomic pending update with sync enqueue.
- `lib/db/repository.test.ts` — update and active-session invariants.
- `messages/es.json`, `messages/en.json` — edit labels, status and validation copy.
- `e2e/pending-edit.spec.ts` — guest edit/save/cancel browser journey.
- `tasks/README.md` — current focus and next ID.

## Decisions

- 2026-11-05 — Reuse the existing title/minutes fields and validation. Preserve ID/createdAt and enqueue the updated pending through the existing sync contract; no schema or dependency change is planned.
- 2026-11-05 — Editing is limited to unfinished, visible pendings and rejected while a running, paused, or confirmation-pending session references the item, because a started timer uses a saved task snapshot.
- 2026-11-05 — The owner approved this implementation plan and the project's local validation checks. Do not run a build in this worktree while its `.next` is used by `next dev`; build/E2E must use an isolated copy.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Initial implementation baseline | Not run | User approved implementation and checks; no project tests/build have run yet. |
| 2026-11-05 | `npm test -- lib/db/repository.test.ts lib/sync/persistence.test.ts` | Passed | 125 tests across the local domain/repository and PGlite-backed account-sync suites. |
| 2026-11-05 | `npm test` | Passed | 486 tests across 51 files. |
| 2026-11-05 | `npm run lint` | Passed | No ESLint warnings or errors. |
| 2026-11-05 | `npm run format:check` | Passed after correction | First run flagged three edited TS files; targeted Prettier write applied, then the full format check passed. |
| 2026-11-05 | `npm run db:check` | Passed | Drizzle journal check only; no database connection. |
| 2026-11-05 | `npm run check:tasks` | Passed | 17 tasks, 0 errors and 0 warnings. |
| 2026-11-05 | Isolated `npm run typecheck` | Passed | Types generated and `tsc --noEmit` passed in `/tmp/avo-pending-022-clone.UEWGkE` after the focus-return ref was explicitly typed. |
| 2026-11-05 | Isolated `npm run build` | Failed, then passed | Turbopack could not resolve Next through an external `node_modules` symlink; succeeded with a physical copy-on-write clone in `/tmp/avo-pending-022-clone.UEWGkE`, including the final UI code. No repo config changed. |
| 2026-11-05 | Isolated `npm run test:e2e` | Passed | 26/26 Chromium journeys with the final keyboard/focus and 320px/dark assertions, including the pending edit flow. Synthetic loopback DB only; no Neon/OAuth/device proof. |
| 2026-11-05 | Isolated `npm run typecheck` after focus assertions | Failed, then passed | Initial `any` inference at `components/pending-view.tsx:492` was corrected with an explicit `HTMLButtonElement | null` type; rerun passed. |
| 2026-11-05 | Targeted `npm run test:e2e -- e2e/pending-edit.spec.ts` from the worktree | Not run | Mistakenly invoked outside the isolated copy; Playwright could not start `next start` because the worktree `.next` has no production build. No build or server was started; all passing E2E runs used the isolated copy. |
| 2026-11-05 | Final isolated `npm run test:e2e` | Passed | 26/26 Chromium journeys with the latest pending edit flow, keyboard/focus assertions, and zero-violation Axe scan of the pending section. Synthetic loopback DB only; no Neon/OAuth/device proof. |
| 2026-11-05 | Axe-enabled pending E2E, isolated | Failed, then passed 3/3 repeats | The first test issued Enter before awaiting menu-item focus; it now waits for the Edit item to be focused. Keyboard open/select, focus entry/return, cancel, 320px overflow, and pending-section Axe scan pass. |

## Log

- 2026-11-05 — Registered task 022 from the approved design feedback. Baseline inspection found no existing pending update API and a clean working tree at `d8b37df`; no application files changed before this plan was saved.
- 2026-11-05 — First `npm run check:tasks` caught that the optional `Files` section listed a planned test file that did not exist yet. Removed that entry (the checklist still records the planned UI test); the guard then passed 17 tasks with no errors or warnings.
- 2026-11-05 — Added transactional `updatePending` and tests for normalization/no-op, terminal states, active sessions, local outbox rollback, and account sync recovery. Focused repository/sync suites passed 125/125; continuing with the menu and form UI.
- 2026-11-05 — Wired the edit menu and prefilled form, added ES/EN copy and a Playwright guest flow for save/cancel while preserving the existing completion/removal menu actions.
- 2026-11-05 — Full suite passed 486/486; lint, format, DB journal, task guard and `git diff --check` passed. Isolated typecheck/build and 26/26 Chromium E2E passed; the edit flow also passed 3 targeted repeats with Axe reporting zero violations in the pending section. The initial keyboard test sent Enter before waiting for the Edit menu item to receive focus; adding that wait resolved the test. One mistaken worktree E2E invocation stopped before starting a server because its `.next` has no production build; no build was run there. Final diff review found no blockers or scope creep. Owner visual review on the actual browser/device remains outstanding.
- 2026-11-05 — Paused 022 for the newly approved task 023; only owner visual acceptance in the real browser/device remains. No application files from 022 were altered for this handoff.
- 2026-11-06 — Per owner instruction, reassigned this branch's pending-edit task from ID 022 to 025 because merged main already uses 022 for the completed Open Graph task; preserved this task's goal, status, and prior evidence.
