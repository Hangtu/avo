# Database (PostgreSQL + Drizzle)

> **Read when:** designing tables, writing queries, or changing the schema. For the step-by-step migration procedure, use [change-database-schema.md](../playbooks/change-database-schema.md).

## Layout

| Path | Content |
|---|---|
| `src/server/db/index.ts` | The Drizzle client (`db`) |
| `src/server/db/schema/<domain>.ts` | Tables for one domain (`projects.ts`, `billing.ts`) |
| `src/server/db/schema/auth.ts` | Better Auth tables (generated; don't hand-edit) |
| `src/server/db/schema/index.ts` | `export * from "./<domain>"` for each file (the only allowed re-export file) |
| `drizzle/` | Generated SQL migrations + metadata, committed |
| `drizzle.config.ts` | drizzle-kit config |
| `scripts/seed.ts` | Development seed data (fake, never production data) |

## Client

The `node-postgres` driver with a pool works with any Postgres. On Vercel Fluid compute, the pool is attached so idle connections close cleanly. Use a **pooled** connection string (e.g., Neon's `-pooler` host).

```ts
// src/server/db/index.ts
import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/env";

import * as schema from "./schema";

const pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export type Database = typeof db;
```

## Schema conventions

- **DB-1 (MUST)** Tables are snake_case plural; TypeScript names are camelCase. `casing: "snake_case"` maps them, so **don't** pass column-name strings.
- **DB-2 (MUST)** Primary keys are UUIDv7: `id: uuid().primaryKey().$defaultFn(() => uuidv7())` (from `uuid`). They are time-ordered, so indexes stay compact. Better Auth tables keep the ID type it generates; foreign keys to `users.id` use the same type.
- **DB-3 (MUST)** Every table has `createdAt` and `updatedAt` as `timestamp({ withTimezone: true })`, not null, defaulting to now. `updatedAt` also uses `.$onUpdate(() => new Date())`. Store UTC only.
- **DB-4 (MUST)** Use constraints, not app code, for integrity: `NOT NULL` by default, foreign keys with an explicit `onDelete`, `unique` for natural keys, and `check` for ranges/enums. Nullable means "unknown", deliberately.
- **DB-5 (MUST)** Index every foreign key, and every column used in `WHERE`, `ORDER BY` or `JOIN` on hot paths. Name indexes explicitly: `index("projects_owner_id_idx").on(t.ownerId)`.
- **DB-6 (MUST)** Use `text` + `check` constraints, or `pgEnum`, for small fixed sets. Prefer `text({ enum: [...] })` with a check when values may evolve; adding values to `pgEnum` requires a migration and can't run inside a transaction on old Postgres versions.
- **DB-7 (MUST)** Money is integer minor units (`priceCents: integer()`) plus an ISO `currency` column. Never use floats.
- **DB-8 (SHOULD)** Use `jsonb` only for genuinely schemaless data (provider payloads, settings blobs). Validate it with Zod on read/write and type it with `.$type<T>()`. Anything you filter or join on deserves a real column.
- **DB-9 (SHOULD NOT)** Add soft deletes (`deletedAt`) by default. They complicate every query and conflict with privacy deletion rights. Add them per table with an ADR when the product needs restore or audit.
- **DB-10 (MUST)** Multi-tenant data: if the product has organizations, every tenant-owned table has `organizationId` (not null, FK, indexed), and **every** query filters by it.

```ts
// src/server/db/schema/projects.ts
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

import { users } from "./auth";

export const PROJECT_STATUSES = ["active", "archived"] as const;

export const projects = pgTable(
  "projects",
  {
    id: uuid().primaryKey().$defaultFn(() => uuidv7()),
    ownerId: text().notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    status: text({ enum: PROJECT_STATUSES }).notNull().default("active"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("projects_owner_id_idx").on(t.ownerId)],
);

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
```

## Query rules

- **DB-20 (MUST)** Only `server/` folders import `db` (ESLint enforces this).
- **DB-21 (MUST)** Select only the columns you need for the DTO. No `select()` of whole rows that contain sensitive columns.
- **DB-22 (MUST)** No N+1 queries. Use joins, `inArray`, or relational queries (`db.query.x.findMany({ with: … })`) to load related data in one or two queries.
- **DB-23 (MUST)** Use transactions (`db.transaction(async (tx) => …)`) for multi-statement writes that must succeed or fail together. Pass `tx` down; don't mix `db` and `tx` inside one transaction.
- **DB-24 (MUST)** Put authorization conditions in the `WHERE` clause of writes (`and(eq(t.id, id), eq(t.ownerId, userId))`) and check the affected row count, so "check then write" races are impossible.
- **DB-25 (MUST)** Use raw SQL only through Drizzle's `sql` template tag, which parameterizes. Never interpolate strings into SQL.
- **DB-26 (MUST)** Every list query has `limit`. Use keyset pagination (`where createdAt < cursor`) for large tables.
- **DB-27 (SHOULD)** Check `EXPLAIN ANALYZE` for new queries on tables expected to exceed ~100k rows.

## Migrations

- **DB-30 (MUST)** Change the schema → `pnpm db:generate` → **read the generated SQL** → `pnpm db:migrate` locally → commit the schema and migration together.
- **DB-31 (MUST NOT)** Edit or delete a migration that has been applied in any shared environment. Fix forward with a new migration.
- **DB-32 (MUST NOT)** Use `drizzle-kit push` against shared databases (preview, staging, production).
- **DB-33 (MUST)** Keep migrations backward compatible with the currently deployed code (expand → migrate → contract). For example, to rename a column:
  1. add the new column;
  2. write to both columns, then backfill;
  3. switch reads to the new column;
  4. drop the old column in a later release.
- **DB-34 (MUST)** Production migrations run in CI before or with the deployment (see [deployment.md](../operations/deployment.md)), never from a laptop.

## Environments and safety

- Each developer has a local DB (Docker Postgres or a Neon dev branch). Preview deployments use a Neon branch per PR; production has its own database with point-in-time recovery enabled.
- The app's DB role has DML rights only. The migration role is separate. Nobody uses superuser credentials in the app.
- Seed scripts refuse to run when `VERCEL_ENV === "production"`.
