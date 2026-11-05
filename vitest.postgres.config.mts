import { defineConfig } from "vitest/config";
import base from "./vitest.config.mjs";

// Explicit opt-in suite: default npm test never connects to Postgres/Neon.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["tests/postgres/**/*.postgres.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
