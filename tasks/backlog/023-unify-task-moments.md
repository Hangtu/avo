# 023 — Unify task moments

id: 023
updated: 2026-11-06

## Goal

Use one `¿Cuándo?` section for creating and editing habits. Dayparts (morning, afternoon, night) can be selected together; copies are only persisted when the form is saved. Preserve the current one-task-record-per-moment model, existing task identity/history, local-first behavior and account sync.

## Out of scope

- Changing a task to one definition with multiple stored windows, schema/migrations, or historical occurrence semantics.
- Reworking time ranges, exact-time rules, day selection, task ordering, or unrelated editor flows.
- Dependencies, auth policy, external services, deployment, commits, or staging/unstaging existing work.

## Next step

Owner: visually review the unified `¿Cuándo?` flow in the actual browser/device, including light/dark presentation; then record acceptance and close the task after validating the board.

## Checklist

### Unified interaction

- [x] Park task 022 for its pending owner visual review, register this task as the only active focus, and validate the task board.
- [x] Show one `¿Cuándo?` multi-select in create/edit; keep `Cualquier hora` and `Elegir horas` exclusive from daypart selections.
- [x] In edit mode, preview which selected moment keeps the existing task ID/history and which moments will create independent copies; cancelling must make no writes.
- [x] Remove the separate `Copiar a otro momento` controls and their immediate side effects. Save current edits and all new copies together; preserve the existing rule that copies omit exact time.
- [x] Update ES/EN help, preview and success copy without changing the local draft format's meaning for already-created copies.

### Data integrity and verification

- [x] Add a transactional, validated and idempotent repository operation to update the existing task and create all copies with outbox entries atomically; test rollback, identity/history preservation and account outbox behavior.
- [x] Add and pass a Playwright flow for multi-select create/edit, save/cancel, custom/any choices, and preserving an exact-time habit while copies omit its exact time; run Axe on the edited section.
- [x] Run tests, typecheck, lint, format, DB journal and task checks after the exact-time edge-case adjustment; run production build/E2E only in an isolated copy to preserve the owner's `.next`.
- [x] Review the final diff and record what automation proves versus the owner's real browser/device; leave visual acceptance pending if the owner has not reviewed it.

## Files

- `components/task-editor.tsx` — unified time selection, preview and save/cancel behavior.
- `lib/db/repository.ts` — atomic update-and-create-copies operation.
- `lib/db/repository.test.ts` — transaction, identity, copy and validation invariants.
- `lib/sync/persistence.test.ts` — atomic account outbox behavior.
- `messages/es.json`, `messages/en.json` — updated localized copy.
- `e2e/task-moments.spec.ts` — create/edit/cancel and custom/any browser journey.
- `tasks/README.md` — current focus, backlog and next ID.
- `tasks/backlog/022-edit-pending-items.md` — parked task awaiting owner acceptance.

## Decisions

- 2026-11-05 — The owner approved unifying the UI while retaining one independent task definition per moment; do not introduce a multi-window task model or migration.
- 2026-11-05 — On edit, if the current daypart remains selected, its task ID/history stays there. If it is deselected, the earliest remaining daypart in Mañana → Tarde → Noche order keeps the existing ID; other selected moments become copies. For an exact-time-only habit, preserve that exact-time record as the base and treat every selected daypart as a copy without exact time. Show the outcome before saving.
- 2026-11-05 — `Cualquier hora` and `Elegir horas` stay exclusive. Copies continue to omit exact time, matching existing behavior. All mutations and copies are draft-only until Save and must commit atomically.
- 2026-11-05 — Task 022 was parked with owner visual acceptance outstanding. Existing staged work is preserved; do not stage or unstage it.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Initial implementation baseline | Not run | No project tests/build run for this new task yet; worktree contains staged deliverables for task 022, which are preserved. |
| 2026-11-05 | `npm test -- lib/db/repository.test.ts lib/sync/persistence.test.ts` | Failed, then passed | First run: 127/128; the rollback fixture count included both original and seeded collision events. Corrected the assertion; rerun passed 128/128. |
| 2026-11-05 | Isolated `npm run typecheck` during editor integration | Failed, then passed | Initial errors were an optional retry `actionId` and preview key mismatch; both were corrected; final typecheck passed after the localized preview update. |
| 2026-11-05 | Isolated `npm run build` | Passed | Production build and service-worker generation succeeded in `/tmp/avo-pending-022-clone.UEWGkE` with synthetic loopback DB/auth values. |
| 2026-11-05 | Targeted `npm run test:e2e -- e2e/task-moments.spec.ts` | Passed | 1/1 Chromium journey covers multi-select create/edit, save/cancel, copies deferred until Save, Any/custom exclusivity, 320px dark reflow and Axe on the editor section. Full E2E remains pending. |
| 2026-11-05 | `npm test` | Passed | 489 tests across 51 files. |
| 2026-11-05 | `npm run lint`, `npm run format:check`, `npm run db:check`, `npm run check:tasks`, `git diff --check` | Passed | Lint clean; formatting clean; journal check only; 18 tasks, 0 errors/warnings; no whitespace errors. |
| 2026-11-05 | Isolated `npm run typecheck` after editor/translation changes | Passed | `next typegen` and `tsc --noEmit` passed in `/tmp/avo-pending-022-clone.UEWGkE`. |
| 2026-11-05 | Final isolated `npm run typecheck` / `npm run build` | Passed | Both passed after exact-time-only handling; synthetic loopback DB/auth values, no remote services. |
| 2026-11-05 | Targeted `npm run test:e2e -- e2e/task-moments.spec.ts` after exact-time handling | Passed | 2/2 Chromium flows, including exact-time preservation while copies omit exact time, plus multi-select/cancel/custom/any and Axe. |
| 2026-11-05 | Final isolated `npm run test:e2e` | Passed | 28/28 Chromium journeys, including multi-select create/edit, cancel without copies, save copies, exact-time preservation, custom/any exclusivity and Axe on the editor section. Synthetic local DB only; no Neon/OAuth/device proof. |

## Log

- 2026-11-05 — Registered from the owner's approval of the simplification proposal. Task 022 moved to backlog for actual browser/device acceptance; task guard passed 18 tasks with no errors/warnings. Existing staged task-022 deliverables remain untouched.
- 2026-11-05 — Added an atomic repository operation for updating one habit and creating copies, with unit rollback/idempotence/history coverage and PGlite account-sync recovery. Corrected a mistaken collision-event count in the rollback test; the focused repository/sync suites pass 128/128. Shared editor controls, localized preview and save-only copies are implemented; full unit suite passed 489/489, lint/format/journal/task guard/diff check passed, isolated typecheck/build passed, targeted Playwright/Axe passed 1/1, and full isolated E2E passed 27/27. Added exact-time-only handling: preserve that task as the base and make selected dayparts copies without exact time. The targeted browser suite passes 2/2; full isolated Chromium E2E passes 28/28. Final diff review found no blockers or scope creep. Synthetic credentials do not prove Neon/OAuth or the owner's device; owner visual acceptance remains outstanding.
- 2026-11-06 — Paused 023 to start sequential-routine implementation. The only remaining work on this task is owner visual acceptance in the actual browser/device; no task 023 code was changed in this handoff.
