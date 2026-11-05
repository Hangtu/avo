import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { directMigrationUrl } from "./lib/db/migration-url";

let env: Record<string, string>;
try {
  env = parse(readFileSync(".env.prod"));
} catch {
  throw new Error("Could not read .env.prod. Create it in the repository root.");
}

const databaseUrl = directMigrationUrl(env.DATABASE_URL_UNPOOLED);

export default defineConfig({
  schema: ["./lib/db/schema.ts", "./lib/db/auth-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
