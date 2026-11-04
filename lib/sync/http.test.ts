import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_BODY_BYTES } from "./protocol";
import { NOW } from "@/tests/fixtures";

const mocks = vi.hoisted(() => ({ session: vi.fn(), read: vi.fn(), mutate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock("@/lib/db/client", () => ({ db: {} }));
vi.mock("./server-repository", () => ({ readAccountData: mocks.read, mutateAccountData: mocks.mutate }));
import { GET, POST } from "@/app/api/account/data/route";

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
  mocks.session.mockResolvedValue({ user: { id: "auth-A" } });
  mocks.read.mockResolvedValue({ version: 1, accountId: "auth-A", records: [] });
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
    expect(mocks.read).toHaveBeenCalledWith({}, "auth-A");
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
  it("does not expose database details on failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.read.mockRejectedValue(new Error("postgresql://secret:password@private.example/database"));
    const response = await GET(req());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "temporarily_unavailable" });
    expect(console.error).toHaveBeenCalledWith("Account persistence unavailable");
  });
});
