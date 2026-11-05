# 014 — Essential backlog cleanup

id: 014
updated: 2026-11-05

## Goal

Keep the approved backlog limited to essential, unresolved product/release
acceptance gates. Consolidate every still-required external E4/F01 criterion
into existing tasks 003–007 rather than dropping it or creating duplicate work.
Reconcile current status with the owner's confirmation that development and
production are separate Neon databases with the same schema; preserve evidence,
task IDs, and all pre-existing staged changes.

## Out of scope

- Reading private env files or connecting to either database; no health/verify,
  migration, data mutation, deployment, OAuth, device, or deletion tests.
- Changing application behavior, committing, staging, or altering pre-existing
  staged work.
- Closing real-account, OAuth, legal, or device acceptance criteria based only
  on database schema readiness.

## Next step

No next step; the documentation cleanup is complete. No product task starts automatically.

## Checklist

### Evidence and source of truth

- [x] Record that dev and prod are distinct Neon databases with the same schema
  per owner; record the shared production `db:verify:prod` output as read-only
  evidence, without copying its host or inferring OAuth/deployment readiness.
- [x] Align `plan.md`'s identity policy with the accepted ADR and current code;
  point the ADR's real-OAuth follow-up to task 005.
- [x] Update the project context's 0004 and current-work status, retaining task
  011/012/013 records as historical evidence.

### Essential backlog

- [x] Keep tasks 003–007 as the essential acceptance gates; remove the Facebook
  identity matrix and redundant schema/deploy checks from task 003.
- [x] Map real import/terminal-state acceptance (E4.4/E4.5.1) to 003, session
  isolation/legacy-surface release checks (E4.6/E4.7) to 004, and receipt/offline
  retention decisions (E4.5) to 007; do not mark them complete.
- [x] Clarify task 007 as an approved, testable account-deletion procedure; do
  not imply that a self-service deletion endpoint exists.
- [x] Remove completed migration-0004 activation from the Icebox; preserve other
  unapproved/deferred work there and preserve all task IDs and history.
- [x] Refresh concise board summaries without changing the backlog's status or
  automatically activating another product task.

### Completion

- [x] Run `npm run check:tasks` after the initial plan and progress checkpoints.
- [x] Review staged/unstaged diffs and preserve the index; no stage/unstage or commit command was issued.
- [x] Record validation, move this task to completed, update board links, and run `npm run check:tasks` after the move.

## Files

- `tasks/README.md` — current focus, essential backlog summaries, Icebox status.
- `tasks/backlog/003-e4-2-selective-account-sync.md` — remove duplicated and
  already-satisfied schema/deployment checklist items; consolidate E4.4/E4.5.1.
- `tasks/backlog/004-e4-1-real-provider-sessions.md` — include E4.6/E4.7 release checks.
- `tasks/backlog/007-f01-legal-and-account-deletion.md` — clarify procedure.
- `plan.md` — accepted identity rule and current migration/schema status.
- `docs/decisions/0001-identity-linking-by-provider-email.md` — correct task link.
- `docs/agent-kit/project-context.md` — current evidence and remaining gates.

## Decisions

- 2026-11-05 — The owner confirms development and production are different Neon
  databases with the same schema. The owner-shared read-only production output
  reports a complete schema and five applied migrations; development was not
  independently queried in this cleanup.
- 2026-11-05 — Schema parity is not evidence of OAuth, account recovery, device,
  legal, or deployed-code acceptance. Keep those requirements open.
- 2026-11-05 — Preserve the staged task 013 work. During this cleanup, the
  index also came to contain some of the documentation edits; no git add, reset,
  restore, or commit command was issued by this agent. Reviewed staged and
  unstaged diffs and left the index untouched.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | `npm run check:tasks` after saving task 014 plan and board focus | Passed | 11 tasks checked; 0 errors, 0 warnings. |
| 2026-11-05 | `npm run check:tasks` after documentation edits | Passed | 11 tasks checked; 0 errors, 0 warnings. |
| 2026-11-05 | `git diff --check` | Passed | No whitespace errors in the unstaged diff. |
| 2026-11-05 | `npm run check:tasks` after move, initial attempt | Failed | The completed task retained one unchecked final checklist item; corrected before rerunning. |
| 2026-11-05 | `npm run check:tasks` after correcting the completed checklist | Passed | 11 tasks checked; 0 errors, 0 warnings. |
| 2026-11-05 | Database / OAuth / device / deletion checks | Not run | Out of scope; no remote access or real-account activity. |

## Log

- 2026-11-05 — Saved the approved documentation cleanup plan before editing.
  Found pre-existing staged changes for task 013; they are outside scope and will
  remain staged and untouched.
- 2026-11-05 — The task guard passed after the initial plan/board checkpoint.
  Began only the listed documentation updates; no external DB or app operations.
- 2026-11-05 — Consolidated E4.4/E4.5.1 in 003, E4.6/E4.7 in 004, and E4.5
  retention decisions in 007 so existing essential product criteria remain
  represented without adding IDs or treating local tests as external evidence.
- 2026-11-05 — Reviewed the exact staged paths/stat and unstaged documentation
  diff; `git diff --check` passed. Moved the task to completed and updated the
  board. The first post-move guard correctly caught one unchecked completion
  item; corrected it before the final guard, which passed all 11 tasks with zero
  errors or warnings. No remote checks were run.
