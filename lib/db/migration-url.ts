/** Pure CLI boundary: never include the supplied credential in an error. */
export function directMigrationUrl(input: string | undefined): string {
  if (!input?.trim())
    throw new Error("DATABASE_URL_UNPOOLED is required for migrations; no pooled/local fallback.");
  const value = input.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid direct migration URL.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname === "/" ||
    !url.pathname
  )
    throw new Error("Migrations require a PostgreSQL URL with an explicit host and database.");
  if (url.hostname.toLowerCase().includes("-pooler."))
    throw new Error("Migrations require a direct connection, not a pooled Neon URL.");
  // pg accepts query-string connection overrides; do not let them silently
  // redirect a hostname/database that the owner just reviewed.
  if (
    ["host", "hostaddr", "port", "database", "dbname", "user", "password"].some((key) =>
      url.searchParams.has(key),
    )
  )
    throw new Error("Migration URL connection-target overrides are not allowed.");
  return value;
}
