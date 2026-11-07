# Tasks

This board is an index. Each task holds the current state needed to resume;
Git and linked archives preserve history.

## Current focus

- [024 — Sequential routines](active/024-sequential-routines.md) — Routine flow and simplified Today task menu verified locally; owner device acceptance pending.

## Backlog (in priority order)

- [023 — Unify task moments](backlog/023-unify-task-moments.md) — Owner's actual-browser/device visual acceptance remains pending.
- [025 — Edit pending items](backlog/025-edit-pending-items.md) — Owner's actual-browser/device visual acceptance is still pending.
- [017 — Continuous liquid background](backlog/017-continuous-liquid-background.md) — Corrected and locally verified; owner acceptance with fresh dev assets pending.
- [003 — E4.2 selective account sync](backlog/003-e4-2-selective-account-sync.md) — owner review and recovery in another browser, after local hardening 011/012.
- [004 — E4.1 real provider sessions](backlog/004-e4-1-real-provider-sessions.md) — real Google session/logout and deployed-environment check.
- [005 — E4.3.1 identity linking matrix](backlog/005-e4-3-1-identity-linking-matrix.md) — both orders, missing email, changed email with real OAuth.
- [007 — F01 legal and account deletion](backlog/007-f01-legal-and-account-deletion.md) — controller identity, support mailbox, retention, remote deletion.
- [006 — E4.8 device and browser coverage](backlog/006-e4-8-device-and-browser-coverage.md) — Safari, physical phone, PWA offline, audio and wake lock.

## Icebox (not approved)

- Authenticated E2E: Playwright setup with a disposable identity and `storageState`, plus axe on account pages. Archived detail: [008](archive/2026-11-04-dropped-tasks/008-authenticated-e2e.md).
- Split oversized modules: `components/task-editor.tsx`, `components/runo-home.tsx` and `lib/db/repository.ts`; characterization tests first. Archived detail: [009](archive/2026-11-04-dropped-tasks/009-split-oversized-modules.md).
- Historical OAuth tokens/backups: separately authorize targeted cleanup and retention review; new writes omit tokens, but dormant historical rows are not erased.
- CSP enforcement: measure static report-only against theme/motion/PWA/OAuth, then approve a compatible enforcement strategy (nonces conflict with PPR). Local diagnostics supersede the old [010](archive/2026-11-04-dropped-tasks/010-nonce-csp.md) idea.
- Verify `app-ci` on GitHub for the eventual release commit after publication is authorized; local checks are not remote CI evidence.
- Review 12 moderate npm lock advisories by 2026-11-18 (4 survive omit=dev through Better Auth → Drizzle Kit/esbuild); see the hardening record. No forced remediation.
- LAN access now requires the owner to set `AVO_DEV_HOSTS` locally and restart dev. Private `.env` was not changed.

## Structure

```text
tasks/
  README.md
  TEMPLATE.md
  active/       # Current work; create when needed
  backlog/      # Approved work waiting to start
  completed/    # Goal met and required validation passed
  archive/      # Historical detail; create when needed
```

The folder is the status. Do not duplicate it in a task header.
Use `NNN-short-title.md` with an unused id across all task folders.
Start from [TEMPLATE.md](TEMPLATE.md).

Next id: **026** (008–010 were retired to `archive/2026-11-04-dropped-tasks/`; IDs 013–014 are reserved on shared main; 025 is the branch-local reassignment of pending-item task 022).

## Board conventions

- List every active and backlog task once in its matching section, using a
  relative Markdown link. Update links whenever a task moves.
- Keep entries to a title and one short sentence about the next action or
  blocker. Completed-task summaries belong in their task files.
- Backlog means approved scope, not permission to start automatically.
- Icebox entries record an idea, its source and enough context to revisit it.
  They do not authorize implementation.
- Write `None.` when a section has no entries.
- Run the guard, `node scripts/check-tasks.mjs`, after every checkpoint and
  every move. It checks task shape, ids, blockers, board links and the
  `Next step` limit; it cannot tell whether a goal is actually met.

## Working conventions

- Default to one runnable task. Record an external wait in `Next step`;
  use optional `blocked-by: NNN` only for another active task. Dependencies
  must exist and must not form a cycle.
- Before implementation, save the whole agreed plan. On resume, read the
  current state and relevant files, verify saved claims against the code, and
  restate Goal, Out of scope and Next step before acting.
- Checkpoint after decisions, meaningful progress and failed attempts, and
  before ending a session. Update the date, next action and checklist first;
  then record actual validation results, including failures and unrun checks.
- Keep `Next step` to one action, its blocker if any, and its completion
  condition, in at most 80 words (the guard fails longer ones). Keep history
  out of this section.
- Keep current decisions, useful failed approaches and relevant evidence in
  the task. Move lengthy historical detail to a linked archive when needed;
  preserve enough context to resume without reading that archive.
- Record out-of-scope findings under `Discoveries`. Before closing, route
  them to approved backlog, the icebox, or a logged dismissal with a reason.
- When a blocker closes, remove the parent's `blocked-by` and resume the
  parent's saved Next step.
- When the user switches to unrelated work, checkpoint the current task and
  move it to backlog before activating the new one. Park a blocker chain
  together and note its ids in the Log.
- Close only when the goal, checklist and the project's required checks are
  satisfied. Update the board and verify links after moving the file.
  Do not reopen a completed task: follow-up work gets a new id and links back.

## Project configuration

Workflow: [AGENTS.md](../AGENTS.md)

That workflow defines validation commands, release requirements, permissions
and any overrides to the defaults above. Do not duplicate those rules in each
task. This scaffold does not replace an existing workflow.
