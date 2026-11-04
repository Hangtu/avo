# Playbook: Change the Database Schema

> **Use when:** adding or changing tables, columns, indexes, constraints or enums.
> **Ask first** before dropping or renaming anything, or rewriting existing data.

## Steps

1. **Design** following [database.md](../backend/database.md):
   - names (DB-1), UUIDv7 IDs (DB-2), timestamps (DB-3), constraints (DB-4);
   - indexes for FKs and query paths (DB-5);
   - tenant scoping (DB-10).

   Write the change into the feature spec.
2. **Classify the change:**
   - **Additive** (new table, nullable column, new index): safe in one release.
   - **Breaking** (rename, drop, type change, `NOT NULL` on existing data): use **expand → migrate → contract** across releases (DB-33). Plan each release in the spec.
3. **Edit** `src/server/db/schema/<domain>.ts` and export new tables from `schema/index.ts`.
4. **Generate:** `pnpm db:generate`. Drizzle may ask about renames interactively; answer deliberately.
5. **Review the SQL** in `drizzle/<timestamp>_<name>.sql`. Confirm:
   - [ ] No unintended `DROP`.
   - [ ] New `NOT NULL` columns on existing tables have a default or a backfill step.
   - [ ] Indexes on large tables use `CREATE INDEX CONCURRENTLY` when needed (in a separate migration, outside a transaction).
   - [ ] Constraint and index names follow conventions.
6. **Apply locally:** `pnpm db:migrate`, then run the app and tests.
7. **Update code:** row types are inferred; update DTO mappers (`toX`), queries, mutations and schemas.
8. **Tests:** PGlite integration tests apply all migrations automatically. Add tests for new constraints (e.g., the unique violation maps to `AppError("conflict")`).
9. **Commit** the schema change and migration together: `feat(db): add projects table` (GIT-13).

## Never

- Edit or delete an applied migration (DB-31).
- `drizzle-kit push` to shared databases (DB-32).
- Run migrations against production from your machine (DB-34).

## Verify

`pnpm verify`; `pnpm db:migrate` on a fresh local database succeeds; the preview deployment's database branch migrates cleanly in CI.

## Done when

The schema, migration, code and tests are consistent, and the rollout plan for breaking changes is written in the spec.
