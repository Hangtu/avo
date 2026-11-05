import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ attach: vi.fn(), drizzle: vi.fn(() => ({})), created: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: { DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1/avo_test" },
}));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: mocks.attach }));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: mocks.drizzle }));
vi.mock("pg", () => ({
  Pool: class extends EventEmitter {
    constructor(options: unknown) {
      super();
      mocks.created(options);
    }
  },
}));

const state = globalThis as typeof globalThis & { runoPool?: unknown; runoObservedPools?: unknown };
const original = { pool: state.runoPool, observed: state.runoObservedPools };
beforeEach(() => {
  vi.resetModules();
  delete state.runoPool;
  delete state.runoObservedPools;
});
afterEach(() => {
  state.runoPool = original.pool;
  state.runoObservedPools = original.observed;
});
describe("idle PostgreSQL pool errors", () => {
  it("handles events outside a route without leaking connection details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { pool } = await import("./client");
    expect(() =>
      pool.emit("error", new Error("postgresql://private:secret@synthetic.invalid")),
    ).not.toThrow();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("Database idle connection unavailable");
    expect(mocks.created).toHaveBeenCalledWith(expect.objectContaining({ connectionTimeoutMillis: 5_000 }));
  });
  it("attaches once across module reloads and covers an old unobserved HMR pool", async () => {
    const legacy = new EventEmitter();
    state.runoPool = legacy;
    const first = await import("./client");
    vi.resetModules();
    const second = await import("./client");
    expect(first.pool).toBe(legacy);
    expect(second.pool).toBe(legacy);
    expect(legacy.listenerCount("error")).toBe(1);
    expect(mocks.attach).not.toHaveBeenCalled();
  });
});
