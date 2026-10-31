import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next loads .env.local automatically; Drizzle Kit runs outside Next.
config({ path: ".env.local" });
config();

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  // `generate` does not connect. `migrate` will fail clearly if this
  // placeholder is reached without real credentials.
  "postgresql://runo:runo@127.0.0.1:5432/runo";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
