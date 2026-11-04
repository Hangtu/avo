import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { defineConfig } from "drizzle-kit";

let env: Record<string, string>;
try {
  env = parse(readFileSync(".env.prod"));
} catch {
  throw new Error("Could not read .env.prod. Create it in the repository root.");
}

const databaseUrl = env.DATABASE_URL_UNPOOLED;
if (!databaseUrl) {
  throw new Error(".env.prod must define DATABASE_URL_UNPOOLED with a direct Neon connection string.");
}

let hostname: string;
try {
  hostname = new URL(databaseUrl).hostname;
} catch {
  throw new Error("DATABASE_URL_UNPOOLED in .env.prod is not a valid URL.");
}
if (hostname.includes("-pooler.")) {
  throw new Error("db:migrate:prod requires a direct connection, not a pooled Neon URL.");
}

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
