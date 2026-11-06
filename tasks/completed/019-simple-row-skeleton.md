# 019 — Simple row skeleton

id: 019
updated: 2026-11-05

## Goal

Replace task 018's outlined-card loading treatment with the owner's example: five compact rows of three rounded skeleton bars, using a reusable `Skeleton` primitive. Keep the existing loading locations, screen-reader status, reduced-motion support, recovery and safe workspace gates.

## Out of scope

- App behavior, authentication, data, loading deadlines or artificial minimum delays.
- Task 017's background/CSS work, prior copy changes, dependencies, configuration, remote services, commits or deployments.
- Clearing site data, restarting the owner's dev server, or modifying the existing Git index.

## Next step

No further implementation step; the five-row loading treatment and local checks are complete. The owner can review it on reload. Task 017 remains parked for separate visual acceptance; no real account, Neon/OAuth, physical-device or screen-reader validation is claimed.

## Checklist

- [x] Read the contract, board, completed task 018 and current implementation; inspect staged/unstaged changes.
- [x] Execute a failing shape regression before changing the loading component.
- [x] Add a dependency-free `components/ui/skeleton.tsx` primitive and simplify the existing shared loading component to the supplied five-row pattern.
- [x] Preserve hidden ES/EN loading text, reduced motion and initialization/recovery behavior; update SSR/browser coverage.
- [x] Run required local checks and production/public browser tests in an isolated copy; review desktop/mobile captures and the scoped diff.
- [x] Checkpoint, close the task, update the board and run the task guard.

## Files

- `components/ui/skeleton.tsx` — reusable rounded bar with an opacity pulse only when reduced motion is not requested.
- `components/task-deck-skeleton.tsx` — replace outlined cards with rows of bars; preserve the shared call sites.
- `components/task-deck-skeleton.test.tsx` — expected row/primitive counts and ES/EN status semantics.
- `e2e/workspace-startup.spec.ts` — public startup/reload visual-shape regression plus existing motion/accessibility/recovery checks.

## Decisions

- 2026-11-05 — Owner supplied a `SkeletonTable` example with five rows, three bars, `max-w-sm`, `gap-2` rows and `gap-4` columns. Follow that lighter treatment without card surfaces/outlines.
- 2026-11-05 — No UI primitive or class-merging utility exists in this checkout. Implement the requested plain-div `Skeleton` locally with existing theme tokens; no package installation is needed.
- 2026-11-05 — This is a follow-up to completed 018, not a reopen. Keep task 017 parked and preserve all prior app/index changes.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Initial inspection | Confirmed | Current shared skeleton renders two opaque card surfaces; the requested replacement is presentation-only. |
| 2026-11-05 | Initial task guard | Passed | 14 tasks, 0 errors/warnings. |
| 2026-11-05 | New shape regression before implementation | Failed as intended | All four focused SSR cases found no reusable skeleton bars in the old outlined-card markup. |
| 2026-11-05 | Final local checks | Passed | Isolated copy `/tmp/avo-skeleton-019.ehd9rq`: 480 tests, lint, format, typecheck, DB journal, task guard and production build. Synthetic loopback-only credentials; no private env files, installs or external service access. |
| 2026-11-05 | Full public browser suite | Passed | 21/21 Chromium journeys. Startup and reload show 15 bars without card surfaces; reduced-motion/normal-pulse checks, accessibility scans, dock clearance, no overflow, and recovery all pass. |
| 2026-11-05 | Screenshot and scope review | Passed locally | Reviewed 1280×900 light desktop and 390×844 dark mobile captures: five rows/three bars match the supplied pattern. No task-017 CSS/test, auth/data/timing, dependency, config or Git-index changes. `git diff --check` passed. |

## Log

- 2026-11-05 — Saved the owner's revised visual direction before implementation; only the simple loading treatment and its regressions are in scope.
- 2026-11-05 — Confirmed the new row-shape regression fails on the outlined cards, then replaced them with a dependency-free `Skeleton` primitive and the exact five-row/three-column spacing pattern. Existing screen-reader loading text and reduced-motion handling remain intact; no loading delay was added.
- 2026-11-05 — All required local checks passed in the isolated copy, including 480 unit tests and 21 public browser journeys. Reviewed both screenshots, completed task 019 and cleared the board focus; preserved prior tasks and all external staged/unstaged work. No commit, deployment, restart or site-data operation.
