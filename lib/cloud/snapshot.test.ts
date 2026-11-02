import { describe, expect, it } from "vitest";

import type { Task } from "@/lib/domain/types";
import { parseBackupSnapshot, rowsForSnapshot, type RunoSnapshot } from "./snapshot";

const now = Date.UTC(2026, 9, 31, 12, 0, 0);

function snapshot(): RunoSnapshot {
  const task: Task = {
    id: "task-1",
    title: "Cepillarme los dientes",
    category: "personal",
    durationMin: 3,
    priority: 3,
    days: [1, 2],
    shortStep: { title: "Preparar el cepillo", durationMin: 1 },
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  return {
    schemaVersion: 3,
    exportedAt: now,
    tasks: [task],
    pendings: [],
    occurrences: [],
    days: [],
    hands: [],
    sessions: [],
    events: [],
    ledger: [],
    settings: {
      id: "preferences",
      audioEnabled: false,
      sound: "brown",
      maxTone: 2,
      theme: "auto",
      showWallet: false,
      updatedAt: now,
    },
    metadata: [{ key: "initial-tasks-v1", value: { completedAt: now } }],
  };
}

describe("cloud snapshot", () => {
  it("validates and maps local rows to Postgres rows", () => {
    const parsed = parseBackupSnapshot(JSON.parse(JSON.stringify(snapshot())));
    const rows = rowsForSnapshot(parsed, "owner", "America/Mexico_City");

    expect(rows.tasks[0]).toMatchObject({
      id: "task-1",
      userId: "owner",
      days: [1, 2],
      windowStart: null,
      shortStepDurationMin: 1,
    });
    expect(rows.settings.userId).toBe("owner");
    expect(rows.metadata[0]?.key).toBe("initial-tasks-v1");
  });

  it("accepts the new sound options", () => {
    const next = snapshot();
    next.settings.sound = "ocean";
    expect(parseBackupSnapshot(next).settings.sound).toBe("ocean");
  });

  it("rejects a different snapshot version", () => {
    expect(() => parseBackupSnapshot({ ...snapshot(), schemaVersion: 2 }))
      .toThrow(/versión/i);
  });

  it("rejects malformed task data before writing", () => {
    const invalid = snapshot();
    invalid.tasks[0] = { ...invalid.tasks[0], durationMin: 0 };
    expect(() => parseBackupSnapshot(invalid)).toThrow();
  });
});
