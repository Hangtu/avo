# 024 — Sequential routines

id: 024
updated: 2026-11-07

## Goal

Convert existing habits into ordered routines that appear as one current-step card in Today. Preserve every member Task ID and its occurrence history; sync routine definitions for accounts while keeping recurring step progress local.

## Out of scope

- Recreating/merging Tasks or rewriting historical Occurrences, Sessions, rewards or Events.
- Nested routines, branching/dependency graphs, auto-changing step schedules, cross-routine membership, or new AI/analytics.
- Remote migrations, Neon/OAuth/device tests, deploy, commit, or staging/unstaging.

## Next step

Owner reviews the corrected routine focus flow and simplified task menu on a real device and decides whether to close 024; local checks and E2E pass.

## Checklist

### State and data

- [x] Park 023 for owner visual acceptance, activate 024 as the only focus, update the board and run its guard.
- [x] Add an ordered `Routine` definition that references existing Task IDs; require 2+ unique active members with matching weekdays and enforce one active routine per Task.
- [x] Persist routines in guest/account IndexedDB and account protocol v2 while retaining v1 compatibility; order Task/Routine dependencies safely. Generate/review an additive Drizzle migration, but never apply it remotely.
- [x] Include routines in snapshots and guest import, remapping imported Task IDs; do not sync routine-run progress or recurring execution data.
- [x] Add atomic routine create/update/archive/ungroup operations and server owner/task-reference validation. Preserve child Tasks and their history when grouping or ungrouping.

### User flow

- [x] Add contextual “Convertir en rutina” from an existing habit, with a routine title and ordered selection of compatible ungrouped habits; keep the primary Habits entry point unchanged.
- [x] Show routines grouped in Hábitos with editable order and an ungroup path; changes never archive/delete member habits.
- [x] Treat the current unresolved step as one Today/franja candidate; hide later routine steps as standalone cards until the prior step resolves. Show routine name and step number; use each step's existing schedule, and preserve pause/neutral skip behavior.
- [x] Add a Playwright journey for conversion, one-card progression, step completion/skip, ungroup/history preservation and ES/EN/Axe coverage.

### Completion

- [x] Run the full test suite, typecheck, lint, format, DB journal and task checks; build/public E2E only in an isolated copy to protect the owner's `.next`.
- [x] Review the diff, report that local tests/build do not prove Neon/OAuth/real-device behavior, and leave actual visual acceptance to the owner.

## Files

- `docs/design/sequential-routines.md` — approved feature behavior and boundaries.
- `lib/domain/types.ts`, `lib/domain/validation.ts`, `lib/domain/selection.ts` — routine definition and ordered candidate logic.
- `lib/db/database.ts`, `lib/db/repository.ts`, `lib/db/schema.ts` — local persistence, atomic operations and additive server schema.
- `lib/sync/protocol.ts`, `lib/sync/local.ts`, `lib/sync/server-repository.ts`, `lib/sync/server-version.ts` — durable sync and tenant checks.
- `lib/db/snapshot.ts`, `lib/db/snapshot-types.ts`, `lib/sync/guest-import.ts` — backup and consented guest import.
- `components/task-editor.tsx`, `components/runo-home.tsx`, `components/franja-task.ts`, `components/task-deck.tsx`, `components/anchor-view.tsx`, `components/session-view.tsx`, `components/end-day-review.tsx` — conversion, group display and single-card step progression.
- `drizzle/0005_orange_jack_flag.sql` — generated additive routine table migration; tested locally only.
- `messages/es.json`, `messages/en.json` — routine copy.
- `tasks/README.md` — focus and backlog index.

## Decisions

- 2026-11-06 — The owner asked to begin implementation after approving the routine direction. Use an ordered group of existing Task IDs, not copied/recreated definitions; each child keeps its own occurrences/history.
- 2026-11-06 — A group must share weekdays; individual time windows remain unchanged and a step appears when its own existing window is eligible. If the next step is not yet eligible, other tasks remain usable and the routine resumes when that step is due.
- 2026-11-06 — Step completion/skip uses existing Task Occurrences. Routine progress is derived locally; no parent completion credit or routine outcome is synced.
- 2026-11-06 — Routine definitions are durable and account-syncable through protocol v2; retain protocol v1 for older clients without routine records. Generate and test additive migration code only; no `db:migrate`, remote schema verification or deploy without separate authorization.
- 2026-11-06 — Task 023 is parked for its outstanding visual acceptance; the task board is the work-state source of truth. Do not stage/unstage the existing task-022 changes.
- 2026-11-06 — Owner requested the shared Habits drag handle instead of visible routine-order arrows. Keep keyboard sorting and a one-click menu alternative for users who cannot drag.

- 2026-11-06 — Owner confirmed the current eligible routine step must take the Today focus slot after the prior step resolves; unrelated tasks remain alternatives and later steps stay hidden.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-06 | Initial task registration | Passed | Task 023 parked; 024 activated; `npm run check:tasks` reported 0 errors and 0 warnings. |
| 2026-11-06 | Full unit suite | Passed | `npm test`: 520 tests across 52 files, including synthetic PGlite/IndexedDB coverage and a regression proving a swapped pending task is prioritized into the next hand despite higher-priority candidates. |
| 2026-11-06 | Typecheck, lint, formatting, DB journal and task guard | Passed | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run db:check`, `npm run check:tasks`; 21 tasks, 0 errors and 0 warnings. |
| 2026-11-06 | Isolated production build and public E2E | Passed | In `/tmp/avo-sequential-routines-check.Ihl4h4`, `npm run build` and `npm run test:e2e`: 31/31 Chromium tests, including ES/EN routine journeys, a three-candidate deck with only the two visible card choices and no extra cycling command, a high-priority unrelated habit, sortable ordering and Axe. Synthetic loopback DB URL/auth secret only; persistence logged unavailable during static build, no DB connection/OAuth/Neon/device coverage. |
| 2026-11-06 | Diff review | Passed | Additive `0005_orange_jack_flag.sql` reviewed and tested locally only. Staged changes were observed during final review; no staging, unstaging or commit performed. Owner still needs real-device visual acceptance. |

## Log

- 2026-11-07 — Parked for the existing owner device acceptance while task 027 resolves the diagnostics/routine-sync merge. No visual acceptance or remote migration is inferred from merge checks.

- 2026-11-07 — Owner requested removing “Terminar por hoy” only from the task-card options menu. Removed that item and the unused Franja callback; retained “Hoy no” and the separate empty-state/day-review flow. ES/EN browser assertions confirm the day-close command is absent and the task-specific skip remains. All 520 unit tests, typecheck, lint, format, `db:check`, isolated build and 31 public Chromium E2E tests pass; no remote/device validation. Existing staged work was preserved without staging or commit.

- 2026-11-06 — Started from the owner's request to implement ordered routines and convert existing habits. The design spec is `docs/design/sequential-routines.md`; board movement and task guard were the first checkpoint.
- 2026-11-06 — Added ordered `Routine` definitions, Dexie/Drizzle persistence, local validation and atomic grouping/ungrouping. Generated additive `0005_orange_jack_flag.sql`; applied only to synthetic PGlite tests, never to Neon.
- 2026-11-06 — Added protocol v2 with v1 compatibility, server owner/member/schedule checks, dependency-safe Task/Routine ordering, snapshots and guest import remapping. Routine run progress remains derived from local child occurrences.
- 2026-11-06 — Added contextual conversion, grouped Habits management, one-current-step Today/anchor/day-review presentation, routine progress in sessions, and Spanish/English copy. Added Playwright conversion/progression/ungroup/Axe journeys; not yet executed.
- 2026-11-06 — Full local checks passed: 520 unit tests, typecheck, lint, format, Drizzle journal, task guard and diff check. The isolated production build and all 30 public Chromium E2E tests passed; the synthetic DB was unreachable by design, so this does not prove account persistence, Neon, OAuth or physical-device behavior.
- 2026-11-06 — Replaced routine-order arrows with the existing sortable grip, dnd-kit keyboard support and a one-click move menu. E2E verifies pointer reorder, menu alternative, ES/EN copy and Axe.
- 2026-11-06 — Final review found staged changes in the worktree; no staging or commit operation was performed. Routine UX on a real device remains for the owner to accept.
- 2026-11-06 — Owner confirmed the current eligible routine step should move into Today’s focus slot after the prior step resolves. Promoted it ahead of unrelated candidates and added regression coverage.
- 2026-11-06 — Follow-up completed: routine editor ordering uses the same grip, keyboard drag support and accessible one-click move menu as Habits; pointer drag and menu alternative pass Axe.
- 2026-11-06 — The screenshot-reported Today issue was fixed: the eligible current routine step is ranked ahead of unrelated habits (after due anchors). Regression tests cover a higher-priority unrelated task; the isolated public E2E suite now passes 31/31.
- 2026-11-06 — Owner clarified that “Mostrar otra opción” should be removed from the menu as well. Removed the cycling command and its copy; Today now exposes only the start and options buttons, while the two displayed cards remain selectable. E2E verifies this with three eligible candidates and confirms the visible alternative can still be promoted; isolated build and all 31 public E2E tests pass.
- 2026-11-06 — Owner confirmed a swapped task must return later rather than remain hidden. The original occurrence stays pending; deferred IDs from closed hands are now prioritized in the next hand and remain prioritized during refresh. Copy explains it will return. Regression tests cover a low-priority deferred task competing with three higher-priority tasks.
- 2026-11-06 — Final verification after the swap-return fix: 520 unit tests, typecheck, lint, format, `db:check`, task guard, isolated production build and all 31 public Chromium E2E tests passed. The isolated build used a loopback dummy DB; no remote service or device was tested.
