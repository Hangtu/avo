# 020 — Loading aligned with the real task card

id: 020
updated: 2026-11-05

## Goal

Replace the table-like skeleton with a restrained preview of the actual task card: shared width, surface, border, padding and typography slots; a faint title/duration/start shape and a subtle alternative behind it. Reveal it only after 150 ms of startup loading, keep that threshold continuous across workspace/home initialization, and never hold back ready content.

## Out of scope

- Authentication, account/guest selection, data, sync, error/sign-out deadlines, or storing a copy of personal data for startup.
- Task 017's background CSS/spec, completed copy changes, dependencies, configuration, remote services, commits or deployments.
- Clearing site data, restarting the owner's dev server, or modifying the existing Git index.

## Next step

No further implementation step. The owner can review a reload with the aligned, deferred card skeleton. All local checks are complete; task 017 stays parked separately. No real account, Neon/OAuth, owner-browser, physical-device or screen-reader validation is claimed.

## Checklist

- [x] Read the contract, board, prior task and current skeleton/real card; inspect staged changes and installed Next guidance.
- [x] Execute a failing shape regression before implementation.
- [x] Keep the reusable `Skeleton` primitive but match the real deck frame with subtle bars and only a start-action shape; no table rows or extra fake controls.
- [x] Add a presentation-only startup provider so the 150 ms threshold survives the workspace-to-home handoff, reserves geometry while hidden and never gates ready children.
- [x] Cover ES/EN semantics, exact threshold, ready-before-threshold behavior, reduced motion, deck alignment, responsive layout and retained recovery.
- [x] Run required local checks and public browser tests in an isolated production copy, review screenshots/diff, checkpoint, complete the task and rerun the task guard.

## Files

- `components/task-deck-skeleton.tsx` — approved minimal deck-shaped loading presentation.
- `components/task-deck-skeleton.test.tsx` — shape, localization, SSR and non-blocking provider expectations.
- `app/page.tsx` — compose the presentation provider outside the unchanged account gate.
- `e2e/workspace-startup.spec.ts` — public startup/reload, timing, motion, responsive layout and recovery coverage.
- `components/ui/skeleton.tsx` — reuse existing primitive; no dependency needed.
- `components/startup-loading-provider.tsx` — 150 ms presentation clock shared across both startup phases.
- `components/runo-home.tsx` — bypass only the outgoing-loading exit wait and reserve the date slot while loading; preserve normal view transitions.
- `components/workspace-fallback.tsx` — reserve the same header date slot so the mobile header does not grow when data arrives.

## Decisions

- 2026-11-05 — Owner approved the proposed visual/timing correction: preserve `Skeleton` but follow the actual card rather than the table example, plus a 150 ms reveal threshold without delaying ready data.
- 2026-11-05 — A single provider outside `AccountWorkspace` owns only presentation readiness. This avoids resetting the reveal timer when workspace selection mounts `RunoHome`; account/sync code stays untouched.
- 2026-11-05 — Reuse existing deck layout classes and back-card scale rather than inventing new surfaces or changing task 017's global CSS. Reserve the slot while hidden so the threshold itself does not shift layout.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Baseline inspection | Confirmed | No active task; 019 completed. Current five-row placeholder disagrees with the real front/alternative card composition. |
| 2026-11-05 | Shape regression before implementation | Failed as intended | All four existing SSR cases fail to find the card structure in the old table-like skeleton. |
| 2026-11-05 | Targeted SSR suite after implementation | Passed | 6/6 ES/EN tests, including hidden frame reservation and ready children remaining rendered inside the presentation provider. |
| 2026-11-05 | First full local checks | Passed | 482 unit tests, lint, format, types, journal, task guard and isolated production build. |
| 2026-11-05 | First public browser suite | 20 passed; 3 failed | Exact 150 ms reveal passed. Desktop full-deck first-fold assumption conflicts with the actual taller live deck; mobile comparison used forced dark vs automatic daytime light; frozen-clock fast-ready case exposed the existing 180 ms loading exit wait. |
| 2026-11-05 | Live-frame diagnostic in disposable guest browser | Confirmed | Actual desktop front card is 666×326px with 36px padding; its alternative naturally continues below the first fold. Keep the focused front above the dock and verify the full deck is vertically reachable, rather than shrinking its frame to the old table footprint. |
| 2026-11-05 | Second full local checks | Passed | 482 tests and all static/build checks passed again. Exact 150 ms threshold and ready-before-threshold browser tests both passed after removing loading exit retention. |
| 2026-11-05 | Second public browser suite | 21 passed; 2 frame comparisons failed | Width, padding, radius and surface matched. Strict border comparison exposed that the theme styles real `section` cards differently from placeholder `div` cards; switched the placeholders to the exact real-card element rather than weakening the comparison. |
| 2026-11-05 | Full rerun after matching card elements | Passed | 482 tests, all static/build checks and 23/23 public Chromium journeys, including both timing cases and strict same-theme surface/border/radius/padding/width comparisons. |
| 2026-11-05 | Side-by-side screenshot review | Additional improvement | Desktop frame matched; mobile still moved by one header date row when real data arrived. Reserved an empty date slot during both loading phases and strengthened the comparison to include absolute top and height as well. |
| 2026-11-05 | Final geometry/timing rerun | Passed | Isolated copy `/tmp/avo-card-loading-020.rHp3Uk`: 482/482 tests, typecheck, lint, format, DB journal, task guard, production build and 23/23 public Chromium journeys. Synthetic loopback-only values, no private env files or remote service calls. |
| 2026-11-05 | Final loading/ready comparison | Passed locally | Strict equal top/left/width/height, surface, border, radius and content padding for the default guest card in 1280×900 light desktop and 390×844 dark mobile. Reviewed both pairs of captures. The focused card clears the dock; the full deck remains vertically reachable. |
| 2026-11-05 | Delay, readiness and accessibility | Passed locally | Skeleton hidden through 149 ms, visible at 150 ms without changing reserved geometry. Ready content renders before the threshold with no later skeleton flash. ES/EN SSR, reduced-motion/static variant, normal opacity pulse, automatic axe scans and slow/storage-error recovery passed. |
| 2026-11-05 | Final scope and diff review | Passed | No account gate, auth/sync/storage/deadline changes, no task-017 background CSS/spec edits or index operations. `git diff --check` passed; no dependency, config, deployment, commit, dev-server restart or site-data operation. |

## Log

- 2026-11-05 — Saved the approved visual and 150 ms timing plan as follow-up 020 before edits; preserve all prior staged/unstaged changes and parked task 017.
- 2026-11-05 — Added the real frame classes, subdued bars, existing back-card scale and a shared 150 ms presentation context. First full checks passed; exact threshold/geometry reservation passed in the browser. Initial regressions exposed the live deck's larger footprint, a test-theme mismatch and the old loading exit wait; recorded each instead of changing auth/data or shrinking the frame.
- 2026-11-05 — Preserve the initial focused card above the dock and validate that the complete deck can scroll clear of it. Add the same public prompt as the live deck and bypass only the outgoing loading transition; normal non-loading screen transitions remain unchanged.
- 2026-11-05 — Side-by-side captures exposed a mobile header jump from the date appearing after loading. Reserved the same empty date slot in both loading phases and added strict absolute-top/height comparisons; the final loading/ready frames now match exactly in both tested viewports.
- 2026-11-05 — Completed task 020 after all final checks passed (482 tests, 23 public browser journeys and all required static/build checks). Reviewed final capture pairs, preserved all prior work/index state, cleared current focus and reran the task guard. Owner visual review and real-device/account evidence remain separate.
