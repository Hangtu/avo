import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { directMigrationUrl } from "./lib/db/migration-url";

config({ path: ".env" });

export default defineConfig({
  schema: ["./lib/db/schema.ts", "./lib/db/auth-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: directMigrationUrl(process.env.DATABASE_URL_UNPOOLED) },
  strict: true,
  verbose: true,
});
