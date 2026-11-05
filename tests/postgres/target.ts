import { directMigrationUrl } from "@/lib/db/migration-url";

/** Never infer from application credentials. The owner must also confirm the local port is not a tunnel. */
export function localPostgresTestTarget(input: string | undefined, confirmation: string | undefined): string {
  if (confirmation !== "1")
    throw new Error("Set AVO_ALLOW_LOCAL_POSTGRES_TESTS=1 only for an approved disposable local database.");
  const value = directMigrationUrl(input);
  const url = new URL(value);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username !== "avo_test" ||
    !/^\/avo_test_[a-z0-9_]+$/.test(url.pathname) ||
    url.search ||
    url.hash
  )
    throw new Error(
      "PostgreSQL integration tests require a plain loopback URL, role avo_test, and a fresh database named avo_test_*; no Neon or application credentials.",
    );
  return value;
}
