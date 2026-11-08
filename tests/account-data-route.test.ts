import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { MAX_BODY_BYTES } from "@/lib/sync/protocol";
import { NOW } from "@/tests/fixtures";

const mocks = vi.hoisted(() => ({ session: vi.fn(), read: vi.fn(), mutate: vi.fn(), consume: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock("@/lib/db/client", () => ({ db: {} }));
vi.mock("@/lib/env", () => ({ env: { BETTER_AUTH_SECRET: "synthetic-limit-test-key" } }));
vi.mock("@/lib/security/rate-limit-store", () => ({
  createRateLimitStore: () => ({ consume: mocks.consume }),
}));
vi.mock("@/lib/sync/server-repository", () => ({
  readAccountData: mocks.read,
  mutateAccountData: mocks.mutate,
}));
import { GET, POST } from "@/app/api/account/data/route";
import { GET as probe } from "@/app/api/account/me/route";

const origin = "https://avo.example.test";
const mutation = () => ({
  operationId: crypto.randomUUID(),
  kind: "pending",
  id: "p1",
  baseRevision: 0,
  value: {
    id: "p1",
    title: "Buro",
    durationMin: 25,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    deletedAt: null,
  },
});
function req(method = "GET", body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/account/data`, {
    method,
    headers: {
      "x-avo-account": "auth-A",
      ...(method === "POST" ? { origin, "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("BETTER_AUTH_URL", origin);
  mocks.consume.mockResolvedValue({ allowed: true, retryAfter: null });
  mocks.session.mockResolvedValue({
    user: { id: "auth-A", name: "Synthetic", email: "synthetic@example.test" },
  });
  mocks.read.mockImplementation(async (_db, accountId, previous) => ({
    version: 1,
    accountId,
    records: [],
    etag: '"synthetic-snapshot"',
    ...(previous === '"synthetic-snapshot"' ? { notModified: true } : {}),
  }));
  mocks.mutate.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());

describe("private account API — mocked session/DB, no external services", () => {
  it("checks a database-backed session and marks responses private/no-store", async () => {
    const response = await GET(req());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(mocks.session).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } }),
    );
    expect(mocks.read).toHaveBeenCalledWith({}, "auth-A", undefined);
  });
  it("uses a private ETag and returns 304 only after authenticating the same account", async () => {
    const first = await GET(req());
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    const again = await GET(req("GET", undefined, { "if-none-match": etag! }));
    expect(again.status).toBe(304);
    expect(await again.text()).toBe("");
    expect(again.headers.get("cache-control")).toBe("private, no-store");
    mocks.session.mockResolvedValue(null);
    expect((await GET(req("GET", undefined, { "if-none-match": etag! }))).status).toBe(401);
  });
  it("allows exact configured LAN origins only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AVO_DEV_AUTH_ORIGINS", "http://192.168.68.109:3000");
    const original = mutation();
    expect(
      (
        await POST(
          req("POST", { version: 1, mutations: [original] }, { origin: "http://192.168.68.109:3000" }),
        )
      ).status,
    ).toBe(200);
    vi.stubEnv("NODE_ENV", "production");
    expect(
      (
        await POST(
          req("POST", { version: 1, mutations: [original] }, { origin: "http://192.168.68.109:3000" }),
        )
      ).status,
    ).toBe(403);
  });
  it("rejects a missing session before accessing domain data", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await GET(req())).status).toBe(401);
    expect((await POST(req("POST", { version: 1, mutations: [mutation()] }))).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("rejects A's outbox when cookies now authenticate B", async () => {
    mocks.session.mockResolvedValue({ user: { id: "auth-B" } });
    const response = await POST(req("POST", { version: 1, mutations: [mutation()] }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "account_changed" });
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it.each(["https://foreign.example.test", "null", ""])(
    "rejects an invalid mutation Origin %s",
    async (value) => {
      expect(
        (await POST(req("POST", { version: 1, mutations: [mutation()] }, { origin: value }))).status,
      ).toBe(403);
      expect(mocks.session).not.toHaveBeenCalled();
    },
  );
  it("rejects a cross-site fetch and non-JSON requests", async () => {
    expect((await POST(req("POST", {}, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(req("POST", {}, { "content-type": "text/plain" }))).status).toBe(415);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("does not accept a claimed owner from the body", async () => {
    expect((await POST(req("POST", { version: 1, userId: "auth-B", mutations: [mutation()] }))).status).toBe(
      400,
    );
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("accepts only durable entities, never timer/events/runtime fields", async () => {
    for (const kind of ["session", "event", "ledger", "occurrence", "day", "hand", "metadata"]) {
      expect((await POST(req("POST", { version: 1, mutations: [{ ...mutation(), kind }] }))).status).toBe(
        400,
      );
    }
    const value = mutation();
    expect(
      (
        await POST(
          req("POST", { version: 1, mutations: [{ ...value, value: { ...value.value, elapsedSec: 60 } }] }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("rejects invalid revisions, overflow, duplicate IDs and oversized batches", async () => {
    const original = mutation();
    for (const mutations of [
      [],
      [original, { ...original, operationId: crypto.randomUUID() }],
      [{ ...original, baseRevision: -1 }],
      [{ ...original, value: { ...original.value, durationMin: 2 ** 31 } }],
      Array.from({ length: 41 }, (_, i) => ({ ...mutation(), id: `p${i}` })),
    ]) {
      expect((await POST(req("POST", { version: 1, mutations }))).status).toBe(400);
    }
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("bounds streamed request bytes even without Content-Length", async () => {
    expect((await POST(req("POST", "x".repeat(MAX_BODY_BYTES + 1)))).status).toBe(413);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("uses the verified identity for valid writes", async () => {
    const original = mutation();
    const response = await POST(req("POST", { version: 1, mutations: [original] }));
    expect(response.status).toBe(200);
    expect(mocks.mutate).toHaveBeenCalledWith({}, "auth-A", [original]);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("throttles anonymous requests before checking the session", async () => {
    mocks.consume.mockResolvedValue({ allowed: false, retryAfter: 42 });
    for (const call of [() => GET(req()), () => POST(req("POST", {})), () => probe(req())]) {
      const response = await call();
      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("42");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ error: "rate_limited" });
    }
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("uses the verified account, never the claimed header, for separate budgets", async () => {
    await GET(req());
    await POST(req("POST", { version: 1, mutations: [mutation()] }));
    await probe(req());
    expect(mocks.consume).toHaveBeenCalledWith("account:read:auth-A", { window: 60, max: 60 });
    expect(mocks.consume).toHaveBeenCalledWith("account:write:auth-A", { window: 60, max: 30 });
    expect(mocks.consume).toHaveBeenCalledWith("account:probe:auth-A", { window: 60, max: 120 });
  });
  it("returns 429 before reading domain data when the account budget is exhausted", async () => {
    mocks.consume
      .mockResolvedValueOnce({ allowed: true, retryAfter: null })
      .mockResolvedValueOnce({ allowed: false, retryAfter: 60 });
    expect((await GET(req())).status).toBe(429);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("generates response IDs without trusting incoming headers, including 304 responses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const headers = { "x-request-id": "synthetic-secret", "if-none-match": '"synthetic-snapshot"' };
    const first = await GET(req("GET", undefined, headers));
    const second = await GET(req());
    expect(first.status).toBe(304);
    expect(first.headers.get("x-request-id")).toMatch(/^[a-f\d-]{36}$/);
    expect(second.headers.get("x-request-id")).not.toBe(first.headers.get("x-request-id"));
    expect(console.error).not.toHaveBeenCalled();
  });
  it.each(["ip", "session", "account", "read", "write", "probe"] as const)(
    "automatically diagnoses a %s failure without exposing input or private errors",
    async (point) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("synthetic-private-query-and-params", {
        cause: Object.assign(new Error("synthetic-private-connection"), { code: "42P01" }),
      });
      if (point === "ip") mocks.consume.mockRejectedValueOnce(error);
      if (point === "session" || point === "probe") mocks.session.mockRejectedValueOnce(error);
      if (point === "account")
        mocks.consume.mockResolvedValueOnce({ allowed: true, retryAfter: null }).mockRejectedValueOnce(error);
      if (point === "read") mocks.read.mockRejectedValueOnce(error);
      if (point === "write") mocks.mutate.mockRejectedValueOnce(error);
      const headers = { cookie: "synthetic-private-cookie", "x-request-id": "synthetic-private-id" };
      const response =
        point === "write"
          ? await POST(req("POST", { version: 1, mutations: [mutation()] }, headers))
          : await (point === "probe" ? probe : GET)(req("GET", undefined, headers));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "temporarily_unavailable" });
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(console.error).toHaveBeenCalledTimes(1);
      const line = vi.mocked(console.error).mock.calls[0][0] as string;
      const stages = {
        ip: "rate_limit.ip",
        session: "session.read",
        account: "rate_limit.account",
        read: "account.read",
        write: "account.write",
        probe: "session.read",
      };
      expect(JSON.parse(line)).toMatchObject({
        event: "account_request_failed",
        operation:
          point === "write" ? "account.data.post" : point === "probe" ? "account.me.get" : "account.data.get",
        requestId: response.headers.get("x-request-id"),
        stage: stages[point],
        errorCodes: ["42P01"],
        durationMs: expect.any(Number),
        stageDurationMs: expect.any(Number),
      });
      expect(line).not.toContain("synthetic-private");
      expect(line).not.toContain("auth-A");
      expect(line).not.toContain("Buro");
    },
  );
  it("does not turn Next framework control flow into a false outage", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const call of [() => GET(req()), () => POST(req("POST", {})), () => probe(req())]) {
      mocks.session.mockImplementationOnce(() => redirect("/"));
      await expect(call()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    }
    expect(console.error).not.toHaveBeenCalled();
  });
  it("does not log expected authentication, origin, validation or rate-limit rejections as outages", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.session.mockResolvedValueOnce(null);
    expect((await GET(req())).status).toBe(401);
    expect((await POST(req("POST", {}, { origin: "https://foreign.example.test" }))).status).toBe(403);
    expect((await POST(req("POST", "{"))).status).toBe(400);
    mocks.consume.mockResolvedValueOnce({ allowed: false, retryAfter: 42 });
    const limited = await GET(req());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("42");
    expect(limited.headers.get("x-request-id")).toMatch(/^[a-f\d-]{36}$/);
    expect(console.error).not.toHaveBeenCalled();
  });
  it("fails closed on limiter outages, including the session probe", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.consume.mockRejectedValue(new Error("synthetic private database details"));
    for (const call of [() => GET(req()), () => POST(req("POST", {})), () => probe(req())]) {
      const response = await call();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "temporarily_unavailable" });
    }
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("does not expose database details on failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.read.mockRejectedValue(new Error("postgresql://secret:password@private.example/database"));
    const response = await GET(req());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "temporarily_unavailable" });
    const requestId = response.headers.get("x-request-id");
    expect(requestId).toMatch(/^[a-f\d-]{36}$/);
    expect(console.error).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(vi.mocked(console.error).mock.calls[0][0] as string);
    expect(entry).toMatchObject({
      event: "account_request_failed",
      operation: "account.data.get",
      requestId,
      stage: "account.read",
      errorKind: "Error",
    });
    expect(JSON.stringify(entry)).not.toContain("postgresql://");
    expect(JSON.stringify(entry)).not.toContain("private.example");
  });
});
