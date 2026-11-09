import { runMigrationCommand } from "@/lib/db/migration-runner";
import { safeErrorSignals } from "@/lib/observability/account-diagnostics";

runMigrationCommand({ args: process.argv.slice(2) }).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    // Last-resort boundary: never let Node print an unhandled private error.
    console.error(
      JSON.stringify({
        event: "migration_failed",
        stage: "runner",
        ...safeErrorSignals(error),
      }),
    );
    process.exitCode = 1;
  },
);
