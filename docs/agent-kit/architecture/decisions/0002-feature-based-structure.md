# 0002. Organize code by feature (vertical slices)

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

AI agents and new developers need to find all the code for one capability quickly, and changes should stay local. Layer-based folders (`components/`, `services/`, `utils/` for everything) scatter one feature across the tree and invite tangled imports.

## Decision

- Group domain code in `src/features/<feature>/`, with a fixed internal layout (`components/`, `server/queries.ts`, `server/mutations.ts`, `server/actions.ts`, `schemas.ts`, …).
- `src/app/` stays a thin routing layer.
- Imports flow one way: `app → features → shared (components, lib, server, i18n, config)`.
- Features never import each other.

## Consequences

- **Positive:**
  - Predictable locations, so agents mirror existing features.
  - Deleting a feature is deleting a folder.
  - Boundaries can be enforced by lint.
- **Negative:**
  - Shared needs must be moved down to a shared folder explicitly.
  - Small duplication between features is accepted.

## Alternatives considered

| Option | Why not |
|---|---|
| Layer-based folders | Poor locality; encourages cross-feature coupling |
| Full Feature-Sliced Design | More layers and rules than an MVP needs |
| Monorepo packages per feature | Overhead before there is more than one app |

## Enforcement

- Per-folder `no-restricted-imports` rules implementing the matrix in [project-structure.md](../project-structure.md).
- `server-only` imports.
- Code review (ARCH-1…8).
