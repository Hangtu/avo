# 015 — Home copy and loader polish

id: 015
updated: 2026-11-05

## Goal

Apply the approved home-copy and persistence-notice feedback in Spanish and English, remove the account-entry curtain animation, correct the long-Settings background seam, and validate the isolated worktree.

## Out of scope

- Changing authentication, account sync, data persistence, or recovery behavior.
- Removing other in-app motion or changing the loading fallback/status copy.
- Redesigning the liquid background beyond keeping its dark-mode layer aligned during page scrolling.
- Dependency, schema, environment, deployment, or remote-service changes.
- Modifying or absorbing the uncommitted work on the shared `main` worktree.

## Next step

No next step; the approved UI changes, final browser regression, diff review, and local checks are complete. Shared main remains untouched.

## Checklist

### Approved UI changes

- [x] Remove the loader reveal curtain and its now-unused animation state while retaining the loading/recovery fallback.
- [x] Set the Spanish tagline to “Retoma donde te quedaste.” and update its English equivalent and public E2E expectation.
- [x] Hide only the generic guest persistence notice at all shared render locations; preserve actionable save/sync warnings.
- [x] Add account-backup guidance only to the Settings account copy, with accurate ES/EN wording.
- [x] Keep the liquid background anchored consistently in dark mode so long Settings content does not expose a visible seam/repeat.
- [x] Add a guest Settings browser regression for account-copy placement and dark-background scrolling.

### Completion

- [x] Run the approved test, typecheck, lint, format, database-check, task-check, build, and public E2E validations; record results and limitations.
- [x] Review the worktree diff, move this task to completed, update the board, and rerun the task guard.

## Files

- `components/account-workspace.tsx` — remove the curtain lifecycle while preserving loading and account selection.
- `app/globals.css` — align dark-mode liquid background attachment with the fixed light-mode layer.
- `components/loading-brand.tsx` — retain the loader brand/background without the reveal animation.
- `components/account-sync-panel.tsx` — suppress only the quiet guest notice shared by its consumers.
- `messages/es.json`, `messages/en.json` — localized tagline and account copy.
- `e2e/public.spec.ts` — align the public heading assertion and cover guest Settings copy/background behavior.

## Decisions

- 2026-11-05 — Use the owner-selected Spanish tagline “Retoma donde te quedaste.”; English equivalent: “Pick up where you left off.”
- 2026-11-05 — Describe account saving as something the user can do after sign-in, not an automatic guest-data import; guest import remains an explicit workflow.
- 2026-11-05 — The long-Settings screenshot shows a horizontal background seam. The liquid light-mode body background is fixed, while its dark-mode counterpart is not; align the dark-mode attachment and verify the result without redesigning the palette.
- 2026-11-05 — Work in Orca worktree `avo-copy-loader-polish`, based on committed `main` at `c7634b4`; leave uncommitted shared-main changes untouched.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | Initial `npm run check:tasks` checkpoint | Passed | 10 task files; 0 errors and 0 warnings. |
| 2026-11-05 | First `npm run typecheck` | Failed | Found one stale `setCurtain(false)` reference in `components/account-workspace.tsx`; removed and rechecked successfully. |
| 2026-11-05 | First `npm run build` in isolated worktree | Failed | Build stopped while validating missing `DATABASE_URL` and `BETTER_AUTH_SECRET`; did not read/copy private env files or contact Neon/OAuth. |
| 2026-11-05 | Final `npm test`, `typecheck`, `lint`, `db:check`, `check:tasks` | Passed | 472 unit tests; TypeScript, lint, Drizzle check and task guard passed. Formatting and E2E were rerun separately after the browser regression was added. |
| 2026-11-05 | `npm run build` with inert loopback-only environment values | Passed | Production build and service-worker generation exited successfully; two `Account persistence unavailable` notices occurred because no local Postgres was running. No Neon/OAuth endpoint was used. |
| 2026-11-05 | Initial `npm run test:e2e` with inert loopback-only environment values | Passed | 10 public Chromium journeys passed against the production build before adding the guest Settings regression. |
| 2026-11-05 | First targeted guest-Settings background E2E | Failed (test assertion) | Chromium computed `background-attachment` as four `fixed` values (one per gradient layer); adjusted the assertion to check each layer. The Settings guidance checks passed first. |
| 2026-11-05 | Targeted guest-Settings background E2E after assertion correction | Passed | Account guidance appears only in Settings, generic guest notice is absent, all four dark background layers are fixed, and scroll reaches the page bottom. Screenshot: `test-results/public-public-shell-keeps--330f4-kdrop-fixed-while-scrolling-chromium/settings-bottom.png`; no visible seam in this viewport. |
| 2026-11-05 | Final `npm run format:check` after adding the Settings E2E | Failed | Prettier flagged formatting in `e2e/public.spec.ts`; formatted the file and reran the check successfully. Other parallel final checks passed. |
| 2026-11-05 | `npm run format:check` and `git diff --check` after formatting | Passed | All files pass Prettier and the diff has no whitespace errors. |
| 2026-11-05 | Final `npm run test:e2e` against isolated production build | Passed | 11 public Chromium journeys passed, including guest-copy placement and the 1025×345 dark Settings background check; no real OAuth, Neon, or physical-device test. |
| 2026-11-05 | `npm run check:tasks` after moving task 015 to completed | Passed | 10 task files; 0 errors and 0 warnings. |

## Log

- 2026-11-05 — Owner approved implementation and selected the Spanish tagline. Created an independent Orca worktree from `main`; no shared-main files were modified.
- 2026-11-05 — Removed the curtain lifecycle, kept the initial loader/recovery UI, hid only the quiet guest notice, and updated account/tagline copy in both locales. Updated the public heading assertion; no sync or auth behavior changed.
- 2026-11-05 — Initial checks: unit tests (472/472), lint, formatting, database check and task guard passed; typecheck found one remaining `setCurtain(false)` call, removed before all six checks passed on rerun.
- 2026-11-05 — Isolated production build first stopped at required `DATABASE_URL`/`BETTER_AUTH_SECRET` validation. Re-ran with a fake loopback-only Postgres URL and build-only auth secret; production build and service-worker generation exited successfully. No private environment file or external DB/OAuth endpoint was used; two expected account-persistence-unavailable logs were emitted.
- 2026-11-05 — Owner added a screenshot of a horizontal seam/repeated-looking background at the bottom of long Settings. Code inspection found dark liquid background attachment differs from light mode; added the scoped correction to this approved task.
- 2026-11-05 — Set `background-attachment: fixed` for the dark liquid body, matching light mode so the visual background stays viewport-anchored during long-page scrolling; no palette redesign.
- 2026-11-05 — All approved checks passed on the implementation; the public Chromium E2E suite passed 10/10 against the isolated production build. The original suite did not exercise guest Settings, so adding a focused browser regression and screenshot check; no actual Neon/OAuth or device test.
- 2026-11-05 — First targeted guest-Settings browser run reached the CSS assertion and exposed that Chromium reports four background layers as `fixed, fixed, fixed, fixed`; corrected the assertion to inspect every layer.
- 2026-11-05 — Targeted Settings E2E passed. The bottom screenshot shows no horizontal seam at 1025×345; the test also confirms guest backup guidance appears in Settings only and the generic guest notice is absent.
- 2026-11-05 — Final checks passed: 472 unit tests, typecheck, lint, format, DB check, task guard, production build and 11 public Chromium E2E journeys. The targeted Settings screenshot at 1025×345 shows no horizontal seam; real OAuth/Neon and physical-device behavior were not tested.
- 2026-11-05 — Moved task 015 to completed, cleared the board's current focus, and reran `npm run check:tasks` (10 files, 0 errors/warnings).
