# 0003. Use PostgreSQL with Drizzle ORM

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

We need a relational store with strong consistency, constraints, transactions and JSON support. We want type-safe queries without hiding SQL, and reviewable migrations. It must run on any managed Postgres; Neon is the default on Vercel.

## Decision

- PostgreSQL is the only primary datastore.
- Drizzle ORM defines the schema in TypeScript (`src/server/db/schema/`), with `casing: "snake_case"`.
- drizzle-kit generates SQL migrations into `drizzle/`. They are committed and applied by `pnpm db:migrate`.
- `drizzle-kit push` is never used against shared databases.

## Consequences

- **Positive:**
  - SQL-shaped, typed queries; no codegen step.
  - Migrations are plain SQL and reviewable.
  - Portable across Postgres hosts.
  - PGlite enables fast in-process integration tests.
- **Negative:**
  - Developers must know SQL and indexing.
  - Drizzle is pre-1.0, so expect API changes on upgrade.

## Alternatives considered

| Option | Why not |
|---|---|
| Prisma | Heavier client and generator; less SQL control |
| Supabase (BaaS) | Vendor coupling; security through RLS everywhere is harder to review |
| MongoDB | Relational data with constraints fits Postgres better |

## Enforcement

- [database.md](../../backend/database.md).
- [change-database-schema.md](../../playbooks/change-database-schema.md).
- The `no-restricted-imports` rule for `@/server/db`.
