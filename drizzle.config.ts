import { defineConfig } from "drizzle-kit";

// generate/check need no credentials. Migration scripts use explicit configs
// that fail closed instead of falling back to pooled URLs or a local database.

export default defineConfig({
  schema: ["./lib/db/schema.ts", "./lib/db/auth-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  strict: true,
  verbose: true,
});
