import type { RunoDatabase } from "./database";
import { appendLedgerEntry } from "./ledger";
import { assertTimestamp } from "@/lib/domain/time";
import type { LedgerEntry } from "@/lib/domain/types";
import { assertId, DomainError } from "@/lib/domain/validation";

export async function getBalance(db: RunoDatabase): Promise<number> {
  const entries = await db.ledger.toArray();
  return entries.reduce((sum, entry) => sum + entry.deltaRc, 0);
}

export interface RedemptionResult {
  entry: LedgerEntry;
  balance: number;
  inserted: boolean;
}

/**
 * Manual redemption of positive whole minutes, never above the ledger balance.
 * The actionId makes a double tap or retry idempotent.
 */
export async function redeemRc(
  db: RunoDatabase,
  amount: number,
  actionId: string,
  now: number,
): Promise<RedemptionResult> {
  assertId(actionId);
  assertTimestamp(now);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new DomainError("validation", "Escribe cuántos minutos quieres usar.");
  }

  const sourceKey = `redeem:${actionId}`;
  return db.transaction("rw", db.ledger, async () => {
    const existing = await db.ledger.where("sourceKey").equals(sourceKey).first();
    if (existing) {
      if (
        existing.deltaRc !== -amount ||
        existing.reason !== "redemption" ||
        existing.occurrenceId !== undefined
      ) {
        throw new DomainError("conflict", "Ese canje ya existe con otro contenido.");
      }
      return { entry: existing, balance: await getBalance(db), inserted: false };
    }

    const balance = await getBalance(db);
    if (amount > balance) {
      throw new DomainError("invalid_transition", "No tienes suficientes minutos.");
    }

    const { entry, inserted } = await appendLedgerEntry(db, {
      sourceKey,
      deltaRc: -amount,
      reason: "redemption",
      at: now,
    });
    return {
      entry,
      balance: inserted ? balance - amount : await getBalance(db),
      inserted,
    };
  });
}
