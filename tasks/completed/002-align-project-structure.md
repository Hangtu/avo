# 002 — Align the project structure with the kit

id: 002
updated: 2026-11-04

## Goal

Make `app/` routing-only, move app UI to the root `components/` folder, move
boundary tests out of `lib/`, add `lib/config/` for site and public routes,
enforce the `lib/ → app/` ban in ESLint, and record the domain glossary. The
behavior and the legal copy must not change.

## Out of scope

- Migrating to `src/features/*` or replacing the stack.
- Splitting oversized modules or changing the timer, sync or auth behavior.

## Next step

Done: merged at `a48b273`. See Validation for the evidence.

## Checklist

### Structure

- [x] Move `app/_components/` to `components/` and update imports.
- [x] Extract the legal page bodies into `components/privacy-content.tsx` and `components/data-deletion-content.tsx`; pages keep metadata and composition.
- [x] Move `lib/site.ts` to `lib/config/site.ts`; add `lib/config/routes.ts` shared by robots and sitemap.
- [x] Move boundary tests to `tests/` and the TaskDeck render test to `components/`.
- [x] Extend Vitest to `lib/`, `components/` and `tests/`.

### Guardrails

- [x] Block `lib/ → app/` imports with ESLint `no-restricted-imports`.
- [x] Add `docs/product/glossary.md` with the domain vocabulary and the `franja`/`runo` exceptions.
- [x] Update the contract with paths, dependency direction and test locations.

### Completion

- [x] Verify the legal copy is unchanged (29 and 18 JSX text nodes, no missing or added text).
- [x] Run format, lint, types, tests, build and E2E.

## Files

- `components/` — app UI.
- `lib/config/site.ts` — canonical origin and site name.
- `lib/config/routes.ts` — public routes shared by sitemap and robots.
- `docs/product/glossary.md` — vocabulary.
- `eslint.config.mjs` — dependency-direction rule.
- `vitest.config.mts` — test roots.

## Decisions

- 2026-11-04 — Keep `app/` + `lib/` at the root; the kit's `src/features` tree is a default for new apps and does not authorize a migration.
- 2026-11-04 — Keep `components/` flat for now; introduce subfolders when a second feature needs them.
- 2026-11-04 — `franja` and `runo` remain domain/persisted terms, recorded in the glossary.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-04 | `npm test` | Passed | 410/410 tests, 40 files after moving test roots |
| 2026-11-04 | `npm run typecheck` | Passed | No stale imports |
| 2026-11-04 | `npm run lint` | Passed | Boundary rule fired on a temporary `lib/ → app/` import |
| 2026-11-04 | `npm run build` | Passed | 13 routes, same output |
| 2026-11-04 | `npm run test:e2e` | Passed | 9/9 Chromium |
| 2026-11-04 | Legal copy | Passed | JSX text comparison: 29/29 and 18/18 nodes, no changes |
| 2026-11-04 | Dev server | Passed | `/`, `/privacy`, `/data-deletion`, `/robots.txt`, `/sitemap.xml` return 200 |

## Log

- 2026-11-04 — Moved 36 UI files, 3 tests and the site config; mechanical and covered by the existing suite.
- 2026-11-04 — The only behavior-adjacent change was splitting the legal pages; the text comparison showed no copy change.
- 2026-11-04 — Committed as `a48b273`; no push.

## History

- [2026-11-03 STATUS snapshot](../archive/2026-11-03-status.md) — prior work-state log.
