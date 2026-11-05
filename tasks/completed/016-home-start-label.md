# 016 — Home start-button label

id: 016
updated: 2026-11-05

## Goal

Change the Spanish home task-card action from “Empezar ▶️” to “Comenzar ▶️”, including its accessible label.

## Out of scope

- Other start actions, English copy, styling, timer behavior, or prior task 015 changes.
- Dependencies, configuration, data, remote services, commits, or deployments.

## Next step

No next step; the requested label and approved local checks are complete. The owner can review the updated button in the existing browser session; no physical-device or screen-reader verification is claimed.

## Checklist

- [x] Inspect the task-card translation and existing worktree changes.
- [x] Change only Spanish `franja.start` to “Comenzar”; retain the icon and accessible-label wiring.
- [x] Run the required local checks without replacing the live dev build.
- [x] Review the scoped diff, complete this task, update the board, and run the task guard.

## Files

- `messages/es.json` — Spanish home task-card start action.

## Decisions

- 2026-11-05 — The owner explicitly requested the label change. The existing shared translation supplies the visible label and its `aria-labelledby` text; no component or English-catalog change is needed.
- 2026-11-05 — Preserve all pre-existing uncommitted task 015 work.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Translation and component inspection | Passed | `components/runo-home.tsx` uses `franja.start` inside the labelled start span; the play icon is separate and unchanged. |
| 2026-11-05 | `git diff --check` | Passed | No whitespace errors after the label edit. |
| 2026-11-05 | Initial source `npm run check:tasks` | Passed | 11 task files; 0 errors/warnings. |
| 2026-11-05 | Isolated `npm test`, `typecheck`, `lint`, `format:check`, `db:check` | Passed | 472/472 tests, types, lint, formatting and migration-journal checks passed. |
| 2026-11-05 | Initial isolated `check:tasks` | Failed (copy setup) | Excluding `.env*` also excluded the tracked `.env.example` referenced by task 007. Copied only that public example and reran successfully; private env files remained excluded. |
| 2026-11-05 | Isolated `npm run build` | Passed | Production build and service-worker generation passed with synthetic loopback-only values. Two expected account-persistence-unavailable notices; no Neon/OAuth. Live dev `.next` was untouched. |
| 2026-11-05 | Explicit catalog assertions | Passed | Spanish `franja.start` equals “Comenzar”; English remains “Start”. |
| 2026-11-05 | Isolated `npm run test:e2e` after build | Passed | 11/11 public Chromium journeys. Suite does not directly exercise the task-card label; no manual browser, physical-device or screen-reader acceptance claimed. |
| 2026-11-05 | Final source task guard and diff review | Passed | Scoped application change is one Spanish translation value; prior task 015 work preserved. |

## Log

- 2026-11-05 — Read the project contract, board, and completed task 015; no active task existed. Inspected dirty/staged state and made the requested one-value Spanish catalog edit without altering the earlier copy/loader changes.
- 2026-11-05 — Validated in disposable copy `/tmp/avo-start-label.LeiYJs`, excluding private environment files and using inert loopback-only build/test credentials. All required checks passed after restoring the public `.env.example` to the copy; 11 public Chromium journeys passed. No dependency, config, data, service, commit, or deployment change.
- 2026-11-05 — Reviewed the narrow catalog change, recorded validation limits, completed task 016 and cleared the current focus. The only new application change is `franja.start`; earlier task 015 changes remain untouched.
