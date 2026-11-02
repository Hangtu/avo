import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { EVENT_TYPES, SOUND_KEYS } from "@/lib/domain/types";
import * as schema from "./schema";

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

  it("uses a composite owner key for days and metadata", () => {
    expect(getTableConfig(schema.days).primaryKeys[0]?.columns.map((column) => column.name))
      .toEqual(["user_id", "date"]);
    expect(getTableConfig(schema.metadata).primaryKeys[0]?.columns.map((column) => column.name))
      .toEqual(["user_id", "key"]);
  });
});
