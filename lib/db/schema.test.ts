import { getAuthTables } from "@better-auth/core/db";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { EVENT_TYPES, SOUND_KEYS } from "@/lib/domain/types";
import * as schema from "./schema";
import { authAccounts, authAdapterSchema, authUsers } from "./auth-schema";

describe("Postgres schema", () => {
  it("keeps the domain tables and enum vocabulary aligned", () => {
    const tables = [
      schema.users,
      schema.settings,
      schema.tasks,
      schema.pendings,
      schema.days,
      schema.hands,
      schema.handItems,
      schema.occurrences,
      schema.sessions,
      schema.events,
      schema.ledger,
      schema.metadata,
    ].map((table) => getTableConfig(table).name);

    expect(tables).toEqual([
      "runo_users",
      "runo_settings",
      "runo_tasks",
      "runo_pendings",
      "runo_days",
      "runo_hands",
      "runo_hand_items",
      "runo_occurrences",
      "runo_sessions",
      "runo_events",
      "runo_ledger",
      "runo_metadata",
    ]);
    expect(schema.eventTypeEnum.enumValues).toEqual(EVENT_TYPES);
    expect(schema.soundEnum.enumValues).toEqual(SOUND_KEYS);
  });

  it("preserves the one-running-session and append-only idempotency invariants", () => {
    const sessionIndexes = getTableConfig(schema.sessions).indexes.map((index) => index.config.name);
    const eventIndexes = getTableConfig(schema.events).indexes.map((index) => index.config.name);
    const ledgerIndexes = getTableConfig(schema.ledger).indexes.map((index) => index.config.name);

    expect(sessionIndexes).toContain("runo_sessions_one_running_per_user_idx");
    expect(eventIndexes).toContain("runo_events_user_action_type_idx");
    expect(ledgerIndexes).toContain("runo_ledger_user_source_idx");
  });

  it("scopes every domain ID to its owner, including join rows", () => {
    for (const table of [schema.tasks, schema.pendings, schema.hands, schema.occurrences, schema.sessions, schema.events, schema.ledger]) {
      expect(getTableConfig(table).primaryKeys[0]?.columns.map((column) => column.name))
        .toEqual(["user_id", "id"]);
      expect(getTableConfig(table).columns.find((column) => column.name === "id")?.primary).toBe(false);
    }
    expect(getTableConfig(schema.handItems).primaryKeys[0]?.columns.map((column) => column.name))
      .toEqual(["user_id", "hand_id", "occurrence_id"]);
  });

  it("includes the owner in every domain foreign key", () => {
    for (const table of [schema.handItems, schema.sessions, schema.ledger]) {
      for (const key of getTableConfig(table).foreignKeys) {
        const reference = key.reference();
        expect(reference.columns[0].name).toBe("user_id");
        // A direct FK to runo_users.id is already owner-scoped.
        if (getTableConfig(reference.foreignTable).name !== "runo_users") {
          expect(reference.foreignColumns[0].name).toBe("user_id");
        }
      }
    }
  });

  it("keeps the generated auth fields compatible with the pinned Better Auth version", () => {
    const requiredTables = getAuthTables({});
    for (const [model, table] of Object.entries(authAdapterSchema)) {
      const required = requiredTables[model];
      expect(required).toBeDefined();
      for (const field of ["id", ...Object.keys(required.fields)]) {
        expect(table).toHaveProperty(field);
      }
      expect(getTableConfig(table).name).toMatch(/^runo_auth_/);
    }
    expect(getTableConfig(authAccounts).indexes.map((index) => index.config.name))
      .toContain("runo_auth_accounts_provider_identity_idx");
    expect(getTableConfig(authUsers).indexes.map((index) => index.config.name))
      .toContain("runo_auth_users_email_normalized_idx");
  });

  it("uses a composite owner key for days and metadata", () => {
    expect(getTableConfig(schema.days).primaryKeys[0]?.columns.map((column) => column.name))
      .toEqual(["user_id", "date"]);
    expect(getTableConfig(schema.metadata).primaryKeys[0]?.columns.map((column) => column.name))
      .toEqual(["user_id", "key"]);
  });
});
