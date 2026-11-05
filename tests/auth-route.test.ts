import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ handler: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { handler: mocks.handler } }));
vi.mock("@/lib/sync/server-auth", () => ({ privateHeaders: { "Cache-Control": "private, no-store" } }));
import { GET, POST } from "@/app/api/auth/[...all]/route";

beforeEach(() => vi.clearAllMocks());
describe("auth HTTP rate-limit/outage boundary", () => {
  it("normalizes Better Auth throttling with standard Retry-After", async () => {
    mocks.handler.mockResolvedValue(
      new Response("internal provider wording", { status: 429, headers: { "x-retry-after": "900" } }),
    );
    const response = await POST(
      new Request("https://avo.example.test/api/auth/sign-in/social", { method: "POST" }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ error: "rate_limited" });
  });
  it("sanitizes thrown and returned store errors", async () => {
    for (const failure of [
      () => {
        throw new Error("synthetic-secret");
      },
      () => new Response("synthetic-secret", { status: 500 }),
    ]) {
      mocks.handler.mockImplementationOnce(failure);
      const response = await GET(new Request("https://avo.example.test/api/auth/get-session"));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "temporarily_unavailable" });
    }
  });
  it("preserves redirects and cookies without caching sessions", async () => {
    mocks.handler.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "/", "set-cookie": "synthetic=value; HttpOnly; Secure; SameSite=Lax" },
      }),
    );
    const response = await GET(new Request("https://avo.example.test/api/auth/callback/google"));
    expect(response.status).toBe(302);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("location")).toBe("/");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
