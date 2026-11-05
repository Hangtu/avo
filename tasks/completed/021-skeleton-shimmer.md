# 021 — Subtle shimmer on the loading bars

id: 021
updated: 2026-11-05

## Goal

Replace the current opacity pulse with the owner-approved subtle left-to-right shimmer on the existing skeleton bars, inspired by https://ui.shadcn.com/docs/utils/shimmer. Keep the accepted real-card geometry, subdued light/dark appearance, shared 150 ms reveal, accessible status and immediate ready content. Use CSS only, without dependencies or new visible loading copy.

## Out of scope

- Card/deck structure, header spacing, translations, provider timing, auth/account selection, data/storage/sync, recovery or navigation behavior.
- Task 017's background CSS/spec, dependencies/configuration, private env files, remote services, deployment or commits.
- Owner dev-server restart/build output, site-data/cache clearing, and existing staged work or Git index operations.

## Next step

No further implementation step. Shimmer follow-up is complete and locally verified; owner can review on reload. No live account, device or screen-reader check is claimed.

## Checklist

- [x] Inspect contract, board, prior task, primitive, startup tests and staged/unstaged scope; read installed Next CSS guidance and applicable animation/accessibility guidance.
- [x] Save the owner-approved plan as follow-up 021 and preserve the existing index.
- [x] Add and run focused browser regressions for a two-second left-to-right highlight instead of a pulse, with unchanged geometry.
- [x] Add namespaced, primitive-only CSS shimmer, reusing theme tokens and clipping the highlight to each bar; no extra JS or dependency.
- [x] Respect reduced motion, pause hidden pre-threshold motion, and keep motion bounded during unusually long waits.
- [x] Verify existing 150 ms/no-delay, exact loaded-frame alignment, ES/EN semantics, recovery and public/background journeys without weakening assertions.
- [x] Run all required checks in an isolated copy, review light/dark motion captures and scope/index, then complete the task and rerun the task guard.

## Files

- `components/ui/skeleton.tsx` — replace only the pulse presentation and keep the public div props.
- `components/ui/skeleton.css` — namespaced transform sweep, theme-derived gradient, hidden-state pause and static reduced-motion fallback.
- `e2e/workspace-startup.spec.ts` — retain all current startup/alignment coverage and add actual shimmer movement, timing and reduced-motion tests.
- `components/task-deck-skeleton.test.tsx` — preserve existing localized skeleton/status SSR regressions.
- `components/startup-loading-provider.tsx` — existing 150 ms presentation boundary; no implementation change planned.

## Decisions

- 2026-11-05 — Owner approved a quiet sweep on the bars rather than the full card, replacing (not combining with) the pulse, around two seconds per sweep, theme-aware and disabled for reduced motion.
- 2026-11-05 — Use a colocated, namespaced stylesheet and transform-only pseudo-element so custom animation stays scoped and task 017's global background work stays untouched. Existing bar/card sizing and opacity remain unchanged. The initial CSS Module attempt was discarded: the project's `*.css` Turbopack/Tailwind loader emits that content as plain CSS, leaving its module selectors/export mismatched. Do not change build configuration for a presentation effect.
- 2026-11-05 — Two two-second sweeps (four seconds total), then static bars during a longer wait, satisfy the project's no-unpausable-motion-over-five-seconds rule without adding controls. Pause while the status is hidden before 150 ms; never extend a load to display/finish an animation.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Read-only orientation | Confirmed | No active task, next ID 021. Prior work is staged and the worktree initially has no unstaged diff. Skeleton currently uses `motion-safe:animate-pulse`; installed Next supports scoped CSS Modules. |
| 2026-11-05 | Browser regression before implementation | Failed as intended | Both new light-desktop/dark-mobile cases in `/tmp/avo-shimmer-021.jV11oa` observed the old `pulse` instead of the required non-pulsing bars. Baseline production build passed with synthetic loopback-only values; no private env files or live `.next` used. |
| 2026-11-05 | First static checks | Passed | 482 tests, lint, format, DB journal, task guard, typecheck and production compilation. |
| 2026-11-05 | First implementation browser suite | 21 passed; 4 failed | CSS Module import emitted plain `.skeleton` rules under the configured Tailwind/Turbopack loader. Build warned about unprocessed `:global`; normal-motion bars had no gradient/animation. Threshold case also timed out; retain its strict assertion and inspect on rerun. |
| 2026-11-05 | Loader diagnosis and scoped compatibility fix | Confirmed | Read `next.config.ts` and emitted CSS: module selectors are unscoped while the component expects module exports. Replaced only this new module with a colocated `.runo-skeleton` stylesheet; no configuration, global background or dependency edits. Build now compiles without the CSS warning; light/dark shimmer geometry tests pass. |
| 2026-11-05 | Timing regression under parallel workers | Passed 3/3 | The test awaited the auth session request before advancing startup time; concurrent Chromium contexts with the paused clock did not always issue that request. Retained the held session route, but synchronized on the rendered skeleton instead of an unrelated network event. Three parallel exact 149/150 ms repetitions pass; no threshold assertion was weakened. |
| 2026-11-05 | Final full isolated verification | Passed | `/tmp/avo-shimmer-021.jV11oa`: 482/482 tests, 51 files; typecheck, lint, format, journal, guard; production build with no CSS parser warning; 25/25 public Chromium journeys. Synthetic loopback-only values, no private env, no remote calls. |
| 2026-11-05 | Shimmer behavior and visual review | Passed locally | Exact CSS transform progression left-to-right across each 2 s sweep, two finite iterations (4 s total), no pulse, unchanged card geometry in 1280×900 light and 390×844 dark. Reduced-motion/automatic-axe, initial 149/150 ms reveal, ready-before-threshold, recovery all pass. Reviewed both midpoint captures; bars remain subdued. |
| 2026-11-05 | Scope and final diff/index review | Passed | `git diff --check` clean. Worktree hash of the entire staged index matches its pre-task hash; changes remain unstaged. No task-017/global background edits, config/dependency changes, owner `.next` build, dev-server restart, account/site-data/network operation or commit. Screenshots are only in the isolated `/tmp` copy; no actual device, assistive-technology or authenticated-service evidence claimed. |

## Log

- 2026-11-05 — Saved approved scope before edits. The linked shadcn utility is for text; adapt its visual idea to the existing bars without installing the package or changing layout.
- 2026-11-05 — Executed the new browser cases against the original pulse: both failed at the expected pulse-removal assertion. Preserved all current strict layout/timing checks and added actual translation samples, finite duration and live reduced-motion switching.
- 2026-11-05 — The first implementation exposed the existing loader's lack of CSS Module processing (emitted CSS inspected). Switched only this new primitive stylesheet to a namespaced plain-CSS import; neither build configuration nor the existing background stylesheet needs modification.
- 2026-11-05 — Traced intermittent exact-timing test timeouts to waiting for `get-session` before exercising the presentation timer under a frozen Playwright clock. The displayed placeholder itself is the test precondition; removed only this separate request wait and repeated the exact timing test three times with parallel workers successfully.
- 2026-11-05 — Final isolated verification passed: 482 tests, all static/build checks and 25 public journeys. Light/dark midpoint and reduced-motion/startup captures reviewed. Confirmed the initial index checksum remains unchanged; no private environment or live build output touched.
- 2026-11-05 — Task 021 complete. The default skeleton now uses a theme-aware, clipped transform shimmer that pauses before the 150 ms reveal, runs twice, then stops; reduced motion stays static. Existing card/readiness/timing/recovery behavior remains verified.
