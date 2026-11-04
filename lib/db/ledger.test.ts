import { describe, expect, it } from "vitest";
import { appendLedgerEntry, creditSourceKey } from "./ledger";
import { setupTestDatabase } from "@/tests/database";
import { NOW } from "@/tests/fixtures";

const testDb = setupTestDatabase();

describe("ledger idempotente", () => {
  it("no duplica un movimiento con la misma fuente", async () => {
    const db = await testDb();
    const sourceKey = creditSourceKey("ropa@2026-10-26", "full");
    const first = await appendLedgerEntry(db, {
      sourceKey,
      occurrenceId: "ropa@2026-10-26",
      deltaRc: 15,
      reason: "full_completion",
      at: NOW,
    });
    const retry = await appendLedgerEntry(db, {
      sourceKey,
      occurrenceId: "ropa@2026-10-26",
      deltaRc: 15,
      reason: "full_completion",
      at: NOW + 1000,
    });
    expect(first.inserted).toBe(true);
    expect(retry.inserted).toBe(false);
    expect(await db.ledger.count()).toBe(1);
  });

  it("rechaza reutilizar la fuente con otro contenido", async () => {
    const db = await testDb();
    const sourceKey = creditSourceKey("ropa@2026-10-26", "short");
    await appendLedgerEntry(db, {
      sourceKey,
      occurrenceId: "ropa@2026-10-26",
      deltaRc: 1,
      reason: "short_step",
      at: NOW,
    });
    await expect(
      appendLedgerEntry(db, {
        sourceKey,
        occurrenceId: "ropa@2026-10-26",
        deltaRc: 2,
        reason: "short_step",
        at: NOW + 1,
      }),
    ).rejects.toThrow("otro contenido");
    expect(await db.ledger.count()).toBe(1);
  });
});
