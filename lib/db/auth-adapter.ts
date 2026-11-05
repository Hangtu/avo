import "server-only";

import { drizzleAdapter, type DrizzleAdapterConfig } from "@better-auth/drizzle-adapter";
import type { BetterAuthOptions, DBAdapter } from "better-auth";
import { boundedTransaction, type ServerDatabase } from "./transaction";

/** Bound persistence, not entire OAuth requests: no provider HTTP inside SQL transactions. */
export function boundedAuthAdapter(
  database: ServerDatabase,
  config: DrizzleAdapterConfig,
): (options: BetterAuthOptions) => DBAdapter {
  return (options) => {
    const adapterFor = (transaction: ServerDatabase) =>
      drizzleAdapter(transaction, { ...config, transaction: false })(options);
    const base = adapterFor(database);
    const run = <T>(operation: (adapter: DBAdapter) => Promise<T>) =>
      boundedTransaction({ database, work: (transaction) => operation(adapterFor(transaction)) });
    const bounded: DBAdapter = {
      ...base,
      create: (input) => run((adapter) => adapter.create(input)),
      findOne: (input) => run((adapter) => adapter.findOne(input)),
      findMany: (input) => run((adapter) => adapter.findMany(input)),
      count: (input) => run((adapter) => adapter.count(input)),
      update: (input) => run((adapter) => adapter.update(input)),
      updateMany: (input) => run((adapter) => adapter.updateMany(input)),
      delete: (input) => run((adapter) => adapter.delete(input)),
      deleteMany: (input) => run((adapter) => adapter.deleteMany(input)),
      consumeOne: (input) => run((adapter) => adapter.consumeOne(input)),
      incrementOne: (input) => run((adapter) => adapter.incrementOne(input)),
      transaction: (work) =>
        boundedTransaction({
          database,
          work: (transaction) => work(adapterFor(transaction)),
        }),
    };
    // Preserve the factory instance identity (Better Auth attaches schema checks
    // in a WeakMap); replacing it with a spread object would lose those checks.
    return Object.assign(base, bounded);
  };
}
