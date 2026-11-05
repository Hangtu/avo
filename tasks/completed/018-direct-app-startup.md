# 018 — Direct app startup without the splash

id: 018
updated: 2026-11-05

## Goal

Replace the reload-only “Abriendo tu espacio…” splash with the normal app frame from the first render. Show a shared task-card skeleton instead of the visible “Preparando tu día…” message during both workspace initialization and home-data loading. Keep private children unmounted until the existing workspace selection succeeds, and retain slow/error/sign-out recovery and the no-JavaScript public content.

## Out of scope

- Authentication, session probes, account/guest selection, timeouts, sync, or storage semantics.
- Displaying cached personal data before account selection, or claiming zero data-loading time.
- Task 017's background/CSS/public-test work, dependency/configuration changes, private data/caches, remote services, commits, or deploys.

## Next step

No further implementation step. The app-frame and shared card-skeleton changes passed local verification. The owner can review a reload in their browser; no server restart, site-data clearing, real account, Neon/OAuth, physical-device or screen-reader validation is claimed. Task 017 remains parked separately for its owner acceptance.

## Checklist

- [x] Read the contract, active task, existing startup UI and installed Next guidance; inspect dirty/staged changes.
- [x] Coordinate the focus handoff with task 017 and activate 018 without disturbing its work.
- [x] Add and execute a failing public regression for the initial app frame while session loading is held.
- [x] Extract/rework the fallback presentation using existing app layout/theme tokens; remove the normal opening text/ink splash and retain recovery/no-JS content.
- [x] Cover successful guest entry/reload, slow/error recovery, both catalogs, and no-JS SSR; preserve the auth/storage gate unchanged.
- [x] Owner follow-up: replace the visible home loading message/two generic blocks with a shared principal/alternative card skeleton, also used during workspace initialization.
- [x] Keep loading feedback available to screen readers, respect reduced motion, avoid fake interactive controls and artificial minimum delays, and cover the shared skeleton in SSR/browser tests.
- [x] Run required local checks and production/public browser tests on the final skeleton implementation in an isolated copy, review evidence and diff, checkpoint and close the task.

## Files

- `components/account-workspace.tsx` — replace only the fallback UI/imports, not selection or security logic.
- `components/workspace-fallback.tsx` — public app frame and existing recovery UI, with no routine splash.
- `components/workspace-fallback.test.tsx` — SSR and ES/EN expectations.
- `e2e/workspace-startup.spec.ts` — entry/reload, skeleton motion/accessibility, slow/error recovery.
- `components/task-deck-skeleton.tsx`, `components/task-deck-skeleton.test.tsx` — shared two-card placeholder, ES/EN semantics, and home-initialization SSR coverage.
- `components/runo-home.tsx` — use the shared skeleton instead of the visible loading message and generic blocks.

## Decisions

- 2026-11-05 — Owner explicitly requested removal of the reload splash and direct app entry. Explain the distinction between immediate app chrome and unavoidable safe data initialization; do not skip account checks or render personal data prematurely.
- 2026-11-05 — Initial inspection found no remaining curtain animation: the visible splash is `WorkspaceFallback`, with an ink background and `sync.opening`. The existing 8-second session deadline and 5-second recovery threshold are not artificial animation delays and must remain unchanged.
- 2026-11-05 — Task 017 handed off and is parked for owner acceptance. Preserve its CSS/E2E work and board entry.
- 2026-11-05 — Owner approved a related follow-up before 018 closed: replace the remaining quick “Preparando tu día…” view with skeleton cards. Extend this same startup task; use one shared component, no background-CSS changes, and no artificial loading delay.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Startup source inspection | Confirmed | Fallback currently replaces the whole app until `selection` exists. Showing the actual app children early would bypass the isolation gate and is not permitted. |
| 2026-11-05 | Initial task guard | Failed (task documentation) | Planned, nonexistent paths were listed under Files; removed those references from Files and retained the planned coverage in the checklist. |
| 2026-11-05 | Task registration guard after correcting Files | Passed | 13 tasks; 0 errors/warnings. |
| 2026-11-05 | Baseline production build + targeted startup E2E | Build passed; regression failed as intended | In `/tmp/avo-startup-018.uXaAR3`, delayed-session test cannot find the app heading during the old splash. |
| 2026-11-05 | Gate preservation comparison | Passed | From `export function AccountWorkspace` to EOF, the source is byte-for-byte identical to the pre-task copy. Only fallback extraction/imports changed. |
| 2026-11-05 | First final static/unit checks and production build | Passed | Isolated copy: 476 tests, typecheck, lint, format, DB journal, task guard and production build passed. |
| 2026-11-05 | First targeted startup browser suite | 3 passed; 1 assertion failed | Entry/reload in light desktop and dark mobile plus slow recovery passed. Storage error was correctly shown, but the unscoped alert locator also matched Next's route announcer; scoped it to the main landmark. No application repair was needed. |
| 2026-11-05 | Full public browser suite after locator correction | Passed | 21/21 public Chromium journeys, including startup/reload, slow/error recovery and task-017 background cases. Axe found no issues on both tested startup themes/viewports. |
| 2026-11-05 | App-frame screenshot review | Passed locally | Reviewed 1280×900 light desktop and 390×844 dark mobile startup captures. No splash or opening text; owner then requested task-card skeletons rather than the brief visible home-loading message. |
| 2026-11-05 | Skeleton regression before implementation | Failed as intended | Updated public startup test cannot find the accessible card-loading status in the earlier empty app frame. |
| 2026-11-05 | Targeted skeleton/fallback SSR tests | Passed | 8/8 tests across ES/EN, including rendering `RunoHome`'s actual initial loading view. |
| 2026-11-05 | Initial skeleton checks | Passed | 480 unit tests, static/build checks and 21 public E2E journeys; both skeleton captures reviewed. |
| 2026-11-05 | Added dock-clearance regression | Found layout issue | A stricter bounding-box check found 6.2px overlap with the fixed dock in the light desktop viewport. Compact the placeholder title/eyebrow spacing without editing shared CSS; keep the clearance assertion. |
| 2026-11-05 | Final skeleton checks after compacting placeholder | Passed | 480/480 unit tests (51 files), typecheck, lint, format, DB journal, task guard, production build and 21/21 public Chromium journeys in `/tmp/avo-startup-018.uXaAR3`. Synthetic loopback-only environment; no private env files or remote integrations. |
| 2026-11-05 | Final skeleton UI/accessibility checks | Passed locally | Reviewed light desktop (1280×900) and dark mobile (390×844) captures. Both cards clear the dock; no horizontal overflow. Entry/reload, removal after readiness, pulse with normal motion and no animations with reduced motion passed. Axe found no automatic WCAG A/AA violations in both startup variants. |
| 2026-11-05 | Final scope and whitespace review | Passed | Workspace selection/sync implementation remains byte-for-byte unchanged. No task-017 CSS/spec edits or stage/unstage commands. No physical-device, screen-reader, real account or owner-browser acceptance claimed. |

## Log

- 2026-11-05 — Owner requested this follow-up after completed task 016. Identified task 017's concurrent work, sent a coordination prompt, and saved a bounded presentation-only plan as backlog 018 before implementation. No auth/data/browser-cache changes.
- 2026-11-05 — Task-017 agent explicitly handed off: its CSS and pixel-regression changes are complete locally, parked awaiting owner acceptance. Activating 018; preserve those files and all external index changes, including the staged former active-task path. Port 3001 had stale server assets even with service workers blocked; no cache clearing or server restart was performed.
- 2026-11-05 — Initial app-frame implementation passed 476 unit tests and all static/build checks plus 21 public E2E journeys. Owner then reported the remaining brief home-loading text and requested card skeletons; saved that approved extension before changing home UI.
- 2026-11-05 — Added one reusable `TaskDeckSkeleton` using the existing deck geometry and theme tokens, used before workspace selection and while home initializes. Text remains screen-reader-only; placeholder actions are non-interactive, and reduced-motion users get static bars. No edits to task 017's CSS or background regression.
- 2026-11-05 — Final checks passed: 480 tests, all required static/journal/task checks, isolated production build and 21 public Chromium journeys. Reviewed final startup screenshots and added a dock-clearance regression after correcting a small desktop overlap. No artificial minimum loading delay or auth/storage behavior change.
- 2026-11-05 — Completed task 018, cleared the current focus, and preserved parked task 017 and the external index state. No commit, server restart, cache clearing, data deletion, remote-service operation or deployment.
