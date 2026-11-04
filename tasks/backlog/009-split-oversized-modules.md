# 009 — Split oversized modules

id: 009
updated: 2026-11-04

## Goal

Bring `components/task-editor.tsx`, `components/runo-home.tsx` and
`lib/db/repository.ts` closer to the kit's soft size limits without changing
behavior, using characterization tests before each structural move.

## Out of scope

- Rewriting the editor or home shell, or changing timer/sync behavior.
- Moving the app to `src/features/*`.

## Next step

Add characterization tests for the editor and home shell first. Then split
`repository.ts` by responsibility, one area per change, and run the full suite
after each move. Stop and record if a test reveals behavior that needs a
product decision.

## Checklist

- [ ] Add characterization tests for `task-editor`.
- [ ] Add characterization tests for `runo-home`.
- [ ] Split `repository.ts` by responsibility.
- [ ] Split the two components into smaller leaves.
- [ ] Run the full suite after each move; no behavior change.

## Files

- `components/task-editor.tsx` — editor (largest file).
- `components/runo-home.tsx` — home shell.
- `lib/db/repository.ts` — Dexie repository.
- `lib/db/repository.test.ts` — existing behavior coverage.
