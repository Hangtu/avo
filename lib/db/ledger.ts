import type { RunoDatabase } from "./database";
import { assertTimestamp } from "@/lib/domain/time";
import type { LedgerEntry } from "@/lib/domain/types";
import { assertId, DomainError } from "@/lib/domain/validation";

export type CreditKind = "short" | "full";

export function creditSourceKey(occurrenceId: string, kind: CreditKind): string {
  assertId(occurrenceId);
  return `credit:${occurrenceId}:${kind}`;
}

export interface LedgerInput {
  sourceKey: string;
  occurrenceId?: string;
  deltaRc: number;
  reason: LedgerEntry["reason"];
  at: number;
}

/** Append-only, source-key idempotent. The ledger is the balance source. */
export async function appendLedgerEntry(
  db: RunoDatabase, input: LedgerInput,
): Promise<{ entry: LedgerEntry; inserted: boolean }> {
  assertId(input.sourceKey);
  if (input.occurrenceId !== undefined) assertId(input.occurrenceId);
  assertTimestamp(input.at);
  if (!Number.isSafeInteger(input.deltaRc) || input.deltaRc === 0) {
    throw new DomainError("validation", "El movimiento debe ser un entero distinto de cero.");
  }
  if (!["full_completion", "short_step", "redemption"].includes(input.reason)) {
    throw new DomainError("validation", "El motivo del movimiento no es válido.");
  }

  return db.transaction("rw", db.ledger, async () => {
    const existing = await db.ledger.where("sourceKey").equals(input.sourceKey).first();
    if (existing) {
      if (
        existing.deltaRc !== input.deltaRc ||
        existing.reason !== input.reason ||
        existing.occurrenceId !== input.occurrenceId
      ) {
        throw new DomainError("conflict", "Ese movimiento ya existe con otro contenido.");
      }
      return { entry: existing, inserted: false };
    }

    const entry: LedgerEntry = {
      id: `ledger:${input.sourceKey}`,
      sourceKey: input.sourceKey,
      ...(input.occurrenceId !== undefined ? { occurrenceId: input.occurrenceId } : {}),
      deltaRc: input.deltaRc,
      reason: input.reason,
      at: input.at,
    };
    await db.ledger.add(entry);
    return { entry, inserted: true };
  });
}
