# 017 — Continuous liquid background

id: 017
updated: 2026-11-05

## Goal

Remove the repeated-looking background band visible on long dark Settings pages in the owner's actual browser and add a regression that detects the rendering fault, not just a CSS property.

## Out of scope

- Account/auth/data behavior, palette redesign, dependencies, or shared-main changes.
- Restarting the owner's dev server or running a build over its `.next` directory.
- Remote services, real OAuth/Neon tests, deployment, commits or merges.

## Next step

Owner: review the corrected long Settings background using fresh assets and confirm the band is gone. Port 3001 still serves stale CSS even with service workers blocked; coordinate a dev-server restart separately rather than clearing browser/site data. Task 017 is parked for this acceptance; task 018 may take the active focus.

## Checklist

### Reproduction and fix

- [x] Record the owner's browser/viewport and identify the layer causing the discontinuity.
- [x] Correct the background rendering while preserving the liquid design and dock usability.
- [x] Add regression coverage for tall and short scrolling viewports and verify actual rendered screenshots.

### Completion

- [x] Run tests, types, lint, format, DB/task checks and production build/public E2E in an isolated copy, without disrupting the dev server.
- [ ] Record evidence and limits, request owner visual acceptance, review the diff, and close only after acceptance.

## Files

- `app/globals.css` — liquid backgrounds and dock scrim.
- `app/layout.tsx` — root/body sizing.
- `e2e/settings-background.spec.ts` — supplement task 015's insufficient property-only regression with six rendered-pixel continuity checks.

## Decisions

- 2026-11-05 — Follow-up to completed task 015, not a reopen: owner still sees the band on port 3001, which Orca confirms serves this worktree.
- 2026-11-05 — Task 015 checked only a short viewport and a `background-attachment` property. Neither proves absence of repeats in a tall page; retain its historical evidence but supplement the weak regression with rendered-pixel continuity checks.
- 2026-11-05 — At 997×1298, Settings scrolls 262px; the band appears at y=1036, exactly `<html>`'s bottom (1298−262), not the dock scrim's top (1118). Body gradients repeat across the root canvas when the document outgrows it. Set shared attachment/repeat longhands after both theme background shorthands.
- 2026-11-05 — The owner's page has a service worker, but a fresh Playwright context with workers blocked also receives old `scroll` CSS from the running dev server. Stale server assets are also involved; do not attribute this only to browser caching or clear owner data. A clean production copy is the verification boundary.
- 2026-11-05 — Agent for the owner's new startup request reserves task 018. Finish the scoped correction/evidence, then park 017 awaiting owner visual acceptance so 018 can be the single active focus.
- 2026-11-05 — Preserve the existing uncommitted task-015 UI changes. The owner now uses `next dev` in this worktree, so production checks must run in another isolated copy.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Orca port ownership | Confirmed | 3001 belongs to `avo-copy-loader-polish`; 3000 belongs to shared main. No server restarted. |
| 2026-11-05 | Fresh browser reproduction, workers blocked | Reproduced | 997×1298, body 1560px tall; background repeats at y=1036. `/tmp/avo-017-before.png`. |
| 2026-11-05 | Temporary presentation-only candidate in disposable browser | Passed visually | Applying body fixed/no-repeat removes the band at the same scroll position; `/tmp/avo-017-candidate.png`. |
| 2026-11-05 | Pixel-regression sensitivity on reproduced screenshots | Confirmed | Old rendering: adjacent RGB-channel jump 33 at y=1036; candidate: maximum 3. Regression threshold is 10. |
| 2026-11-05 | `npm test`, `typecheck`, `lint`, `format:check`, `db:check`, `check:tasks` | Passed | Isolated copy `/tmp/avo-background-017.Va2Ya5`: 472 unit tests; all static, schema-journal and task checks passed. |
| 2026-11-05 | Production build and `npm run test:e2e` | Passed | Same isolated copy, synthetic loopback port-1 URL and build-only secret; 17/17 public Chromium E2E passed, including six dark/light tall/short/mobile background tests. No Neon/OAuth access; expected account-persistence-unavailable logs. |
| 2026-11-05 | Actual production screenshot, dark tall view | Passed locally | `/tmp/avo-background-017.Va2Ya5/test-results/settings-background-Settin-e38d3-ontinuous-in-dark-tall-view-chromium/settings-bottom.png` has no band. Owner-browser/physical-device acceptance remains pending. |

## Log

- 2026-11-05 — Owner supplied a tall screenshot of the same band after task 015. Acknowledged the correction was insufficient and saved this scoped follow-up. Another agent concurrently reserved 016; discarded our unregistered duplicate and allocated unused 017 before registering it. Its label task remained the only active task until it completed; activated 017 afterward. No edits to the other agent's files.
- 2026-11-05 — Fixed/no-repeat longhands now apply after both theme shorthands at matching specificity. Added isolated-browser coverage for dark/light tall, short and mobile Settings viewports; checks CSS and adjacent rendered RGB pixels at both side gutters.
- 2026-11-05 — All required local checks passed in `/tmp/avo-background-017.Va2Ya5`, including 472 unit tests and 17 public E2E. Visually inspected the corrected 997×1298 production screenshot. Reviewed the CSS/test diff; no account/layout changes, no commits, merges, stage/unstage or server restart. Other actors staged the existing work; preserved their index.
- 2026-11-05 — Parking 017 in backlog for owner acceptance and fresh-asset review so the already-approved task 018 can become the single active focus. Keep 017 open; no claim that the owner's stale dev browser is already fixed.

## History

- [015 — Home copy and loader polish](../completed/015-home-copy-and-loader-polish.md)
