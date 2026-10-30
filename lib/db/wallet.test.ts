import { describe, expect, it } from "vitest";
import { appendLedgerEntry } from "./ledger";
import { getBalance, redeemRc } from "./wallet";
import { setupTestDatabase } from "@/tests/database";
import { NOW } from "@/tests/fixtures";

const testDb = setupTestDatabase();

async function credit(db: Awaited<ReturnType<typeof testDb>>, amount: number) {
  await appendLedgerEntry(db, {
    sourceKey: `test-credit:${amount}`, occurrenceId: `occ:${amount}`,
    deltaRc: amount, reason: "full_completion", at: NOW,
  });
}

describe("monedero y canje", () => {
  it("suma el ledger y debita un canje entero", async () => {
    const db = await testDb();
    await credit(db, 20);
    expect(await getBalance(db)).toBe(20);

    const result = await redeemRc(db, 5, "redeem-1", NOW + 1000);
    expect(result).toMatchObject({ balance: 15, inserted: true });
    expect(result.entry).toMatchObject({ deltaRc: -5, reason: "redemption" });
    expect(await getBalance(db)).toBe(15);
  });

  it("repetir el mismo actionId no duplica el débito", async () => {
    const db = await testDb();
    await credit(db, 20);
    await redeemRc(db, 5, "redeem-1", NOW + 1000);
    const retry = await redeemRc(db, 5, "redeem-1", NOW + 2000);
    expect(retry).toMatchObject({ balance: 15, inserted: false });
    expect(await db.ledger.filter((entry) => entry.reason === "redemption").count()).toBe(1);
    expect(await getBalance(db)).toBe(15);
  });

  it("no permite deuda, cero, fracciones ni más que el saldo", async () => {
    const db = await testDb();
    await credit(db, 10);
    await expect(redeemRc(db, 11, "over", NOW)).rejects.toThrow("saldo");
    await expect(redeemRc(db, 0, "zero", NOW)).rejects.toThrow("entera positiva");
    await expect(redeemRc(db, 1.5, "fraction", NOW)).rejects.toThrow("entera positiva");
    expect(await getBalance(db)).toBe(10);
    expect(await db.ledger.filter((entry) => entry.reason === "redemption").count()).toBe(0);
  });

  it("serializa canjes concurrentes sin saldo negativo", async () => {
    const db = await testDb();
    await credit(db, 10);
    const results = await Promise.allSettled([
      redeemRc(db, 8, "concurrent-a", NOW + 1000),
      redeemRc(db, 8, "concurrent-b", NOW + 1000),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await getBalance(db)).toBe(2);
    expect(await db.ledger.filter((entry) => entry.reason === "redemption").count()).toBe(1);
  });

  it("conserva el saldo al reabrir la DB", async () => {
    const db = await testDb();
    await credit(db, 12);
    await redeemRc(db, 4, "durable", NOW + 1000);
    db.close();
    const reopened = await testDb(db.name);
    expect(await getBalance(reopened)).toBe(8);
  });
});
