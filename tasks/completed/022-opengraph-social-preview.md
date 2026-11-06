# 022 — Open Graph social preview

id: 022
updated: 2026-11-06

## Goal

Make Avo look distinctive when its public URLs are shared: the home page and both legal pages expose complete Open Graph and large Twitter-card metadata, backed by one polished 1200×630 image made from the existing Avo mascot. Metadata remains public, static, and free of personal data.

## Out of scope

- An in-app share button or dynamic/per-user social images.
- Locale-specific URLs or a separate English preview URL; routes are not localized.
- Deployment, DNS/domain configuration, external platform debugging, or social-account operations.
- New packages, database/auth changes, analytics, or LLM-generated artwork.

## Next step

Local implementation and validation are complete; production-domain crawler preview checks remain a separate release activity after the public origin is configured and explicitly authorized.

## Checklist

### First outcome

- [x] Save the user-approved scope as task 022, verify the ID is unused, repair the stale task-board conflict block, and set the current focus.
- [x] Create one static social image using `app/icon.png`, the existing liquid palette, the Avo wordmark, and existing Spanish brand copy; keep it below 5 MB.
- [x] Add shared image metadata and translated alt text to both message catalogs, preserving ES/EN key parity.
- [x] Add the image and `summary_large_image` Twitter metadata to the home page; include the image in both legal pages because their nested `openGraph` metadata overrides the root object.
- [x] Extend public Playwright coverage for Open Graph/Twitter tags and the image response on `/`, `/privacy`, and `/data-deletion`.

### Completion

- [x] Run the approved local checks and record unavailable checks without installing dependencies or altering the lockfile.
- [x] Inspect the rendered asset and generated page metadata; record that actual social-platform caches and production delivery remain unverified until separately authorized.
- [x] Route the remaining production-domain limitation to a separate authorized release check, move task 022 to completed, and verify the board.

## Decisions

- 2026-11-05 — Use one hand-composed static PNG rather than runtime generation: the same evergreen image serves all current public routes without adding a package or dynamic data path.
- 2026-11-05 — Use Spanish (Mexico) copy for this shared preview, matching the default locale and lack of locale-specific URLs; keep any new alt-text key present in both ES/EN catalogs.
- 2026-11-05 — Keep the artwork encouraging and non-shaming, in line with the current product contract; do not expose tasks or account data.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-05 | `npm run check:tasks` after task creation | Passed | 19 task files, 0 errors, 0 warnings. |
| 2026-11-06 | Social image dimensions, size, and visual review | Passed | `public/og/avo-share.png` is 1200×630 PNG (402,298 bytes); composed from `app/icon.png`, and the text/layout are legible in the reduced preview. |
| 2026-11-06 | Prettier 3.9.10 check on changed TS/JSON files | Passed | First check flagged formatting in `e2e/public.spec.ts`; formatted that file and reran the check successfully. |
| 2026-11-06 | ES/EN message metadata key parity | Passed | Both catalogs contain `meta.socialImageAlt`; English and Spanish alt text are present. |
| 2026-11-06 | `npm test` in isolated copy | Passed | 489/489 tests across 52 files. |
| 2026-11-06 | `npm run typecheck`, `lint`, `format:check`, `db:check`, `check:tasks` | Passed | All five commands passed in the isolated copy; task guard reported 19 tasks, 0 errors, 0 warnings. |
| 2026-11-06 | `npm run build` in isolated copy | Passed | Next 16.4.3 production build and service-worker generation passed with synthetic loopback DB/auth configuration; initial symlinked dependency tree was outside Turbopack's filesystem root, so the retry used a local hardlink tree. |
| 2026-11-06 | `npm run test:e2e` first run | Failed, 25/26 | All social-preview assertions except the home `og:url` passed; Next resolves the root URL as `http://localhost:3000` without `/`, while the test required `/`. Updated the root matcher to allow the optional slash. |
| 2026-11-06 | `npm run test:e2e` rerun | Passed | 26/26 Chromium journeys, including OG/Twitter metadata for all three public routes and the image response. |
| 2026-11-06 | Final `npm run lint` and `npm run format:check` after E2E matcher fix | Passed | Both passed in the disposable copy with the final E2E source. |
| 2026-11-06 | `git diff --check` | Passed | No whitespace errors in the worktree diff. |
| 2026-11-06 | `npm run check:tasks` after task movement | Passed | 19 task files, 0 errors, 0 warnings. |

## Log

- 2026-11-05 — User approved the plan and implementation. Read-only inspection found IDs 001–021 assigned or retired and no active task; selected unused ID 022 and replaced literal merge-conflict markers in `tasks/README.md` with the verified next ID.
- 2026-11-05 — Task 022 registered as current focus; the task guard passed after the board update.
- 2026-11-06 — Created and visually inspected the static share image; moved Next step to metadata/catalog wiring.
- 2026-11-06 — Wired shared OG/Twitter image metadata into all three public routes and expanded the existing public E2E assertions.
- 2026-11-06 — Prettier caught one style issue in the E2E helper; formatted the test and confirmed all changed source files pass Prettier.
- 2026-11-06 — Full unit/type/lint/format/database/task checks and isolated production build passed. First public E2E run found an overstrict trailing-slash expectation for the home Open Graph URL; corrected the matcher, then reran all 26 cases successfully.
- 2026-11-06 — Initial Vitest run exposed that importing `server-only` site configuration into the legal page tests breaks their Server Component render harness. Kept the shared social metadata config client-safe and relied on the existing root `metadataBase`; all 489 tests then passed.
- 2026-11-06 — Final E2E rerun passed 26/26; final lint, formatting, and diff checks passed. No production deployment or third-party social debugger was used.
- 2026-11-06 — Moved task 022 to completed; the production origin and social-platform fetch remain unverified.
- 2026-11-06 — Task guard passed after the board and task location were updated.
