# Sequential routines — feature spec

- **Status:** In progress
- **Scope / owner:** Task 024; owner-approved routine implementation request (2026-11-06)
- **Project contract:** [`docs/agent-kit/project-context.md`](../agent-kit/project-context.md)

## Objective and scope

Allow a person to group existing habits into a named, ordered routine that appears as one current step in Today. Preserve the existing habit IDs, definitions and occurrence history. Routine definitions are durable and syncable; step progress is derived from each child's existing local occurrences and is not synced.

Version 1 creates routines by grouping existing active habits in Habits. It does not add a second global “new routine” action; a person can create the habits first and then group them from a habit's options.

## Acceptance criteria

- Given two or more active habits, when the person converts them into a routine, then the selected order is saved without cloning, deleting, renaming or changing the IDs of those habits.
- A habit belongs to at most one active routine. Conversion rejects an invalid/duplicate/archived member and requires all members to use the same weekdays; it does not silently rewrite schedules. Step time windows/exact-time settings remain on their original habits.
- Habits in a routine no longer appear as independent candidates in Today. When its current step is eligible, the routine takes the focus card and shows its name, current child step and “step X of N”; resolving that step advances the same focus slot to the next eligible step without auto-start. Later steps are not offered early, and unrelated habits remain alternatives.
- Each child still uses its existing task occurrence, timer, completion and history. A completed or already-done step advances the sequence. A not-applicable step may be skipped neutrally and earns no credit; routine progress/completion is not a new synced result.
- If the next step is outside its own window, the sequence waits for that step's eligibility; unrelated eligible habits remain available. A missed step uses the existing explicit late-start behavior.
- In Habits, steps are shown under their routine; editing the routine can rename/reorder/remove steps, and ungrouping restores its member habits as standalone without changing their histories.
- A signed-in account recovers the same routine definition and task links. Server writes verify that all referenced Task IDs belong to the authenticated owner. Guest stays fully offline.
- Backup/restore and guest-to-account incorporation preserve routine links with the remapped Task IDs.

## Implementation plan

- Use a durable `Routine` definition with an ID, title, ordered Task IDs, timestamps and an archive tombstone. Do not introduce a second task/history model.
- Add the routine table to Dexie and Drizzle/Postgres, add strict protocol validation and a `routine` durable sync kind, and include routines in snapshot/guest-import handling. Use account-data protocol v2 for routines while retaining v1 reads/writes for older clients. Order sync so new Task definitions are acknowledged before Routine references and Routine archive tombstones before related Task archives. Generate an additive migration; **do not apply it to any Neon database or deploy**.
- Keep current Task/Occurrence/Session entities for each step. The routine current step is derived locally from its ordered member occurrences for the current date. `proposeHand` and `ensureFranja` promote an eligible current step into the focus slot and exclude later member tasks as standalone candidates.
- In Habits, add “Convertir en rutina” to an eligible task's options, preselect it as the first step, and let the person choose/order other ungrouped habits. Display/manage routine groups in the same tab; ungrouping archives only the group record.
- Routine step membership requires the same weekdays to avoid a chain that cannot run on a day; preserve each step's own time window. Do not create automatic links between unrelated routines.

## UI and accessibility

- Keep the existing Habits tab and its “Nuevo hábito” primary action; routine conversion is contextual in the habit options menu, not a second permanent primary button.
- Make routine name/order and the current step obvious. Reuse the Habits sortable grip for routine order, with keyboard sorting and a one-click move-menu alternative.
- Today retains one focus card and the existing timer surface. Show the current step and progress; do not show a dashboard or auto-start the next timer. Pause/skip/exit behavior stays neutral.
- ES/EN catalogs; keyboard, focus, reduced motion, narrow viewport and Axe checks are part of the UI journey.

## Data and access

- Routine IDs are distinct from Task IDs; `taskIds` are ordered references to existing Tasks. Validate minimum/maximum size, uniqueness, active task existence, one-active-routine membership and same weekdays at local and server boundaries.
- Routine writes and their outbox entry are one local transaction. The server derives the owner from the verified session, scopes the routine row by that owner, and verifies every referenced Task belongs to that same account. It never trusts client-supplied account IDs.
- Routine definitions synchronize; routine runs, step progress, Occurrences, Sessions and Events remain local under the current product contract. A member Task cannot be archived from a routine; remove it from the group first.
- Migration is additive and generated/reviewed locally only. Remote migration, Neon verification and deploy are explicitly out of scope.

## Integrations and privacy

- Extend the existing account-data protocol under the same authenticated owner boundary; no new provider or external service. Preserve body limits, idempotency, revision conflicts and tenant isolation.
- Backups and guest-import summaries include routine definitions. Import maps each referenced source Task ID to its imported Task ID; a routine is not imported if a referenced task is missing or invalid.

## Verification and rollout

- Domain/repository tests: routine validation, same-weekday rule, duplicate membership, rollback, ordered progression, archived/un-grouped behavior and no task/history loss.
- PGlite account-sync tests: owner isolation, valid task references, two-account protection, routine bootstrap/round-trip and schema migration.
- E2E: create/convert from existing habits, routine appears as one card, step order gates the next step, cancel/skip behavior, ungroup preserving members, keyboard/mobile/light-dark and Axe.
- Run project checks and an isolated production build/E2E copy. Do not build over the owner's `.next`; no remote DB/OAuth/device tests are implied.
- Owner visual/device acceptance remains separate from automated browser evidence.

## Decisions and current state

- 2026-11-06 — Owner approved implementation. Routines group existing habits by reference, preserving Task IDs and histories. One active routine per task; same weekdays are required; each step retains its own time window.
- 2026-11-06 — No routine-level completion/RC is created. Child occurrences retain their current semantics; run progress is local and derived. Definitions synchronize as durable data.
- 2026-11-06 — Routine definitions use protocol v2 so older v1 clients do not receive an unknown record kind. Server continues to serve v1 tasks/pendings/settings for older clients.
- 2026-11-06 — Migration source may be generated and tested locally, but no remote migration or deployment is authorized.
- 2026-11-06 — Owner requested consistent routine ordering with the Habits drag grip instead of visible arrows; retain keyboard operation and a single-click alternative.
- 2026-11-06 — Owner confirmed that an eligible routine step must occupy Today’s focus slot after the previous step resolves. Unrelated tasks remain available as alternatives; later routine steps stay hidden.
- Implementation includes the durable model, protocol v2, snapshots/guest remapping, Habits management and current-step Today/anchor/day-review presentation. An eligible current routine step takes the focus slot ahead of unrelated tasks (after due anchors); resolving it advances the slot. Full local checks and isolated production build/public E2E pass.
- Current next step: owner reviews the routine UX on a real device. Remote migration, Neon/OAuth and physical-device testing were not run and remain unauthorized/out of scope.
