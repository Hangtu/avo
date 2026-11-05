import { afterEach, describe, expect, it, vi } from "vitest";
import { httpTransport } from "./client";
afterEach(() => vi.unstubAllGlobals());
describe("sync throttling transport", () => {
  it("preserves the standard retry delay without consuming or rewriting local data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "42" } }),
      ),
    );
    await expect(
      httpTransport(new AbortController().signal).mutate("synthetic-account", []),
    ).rejects.toMatchObject({ status: 429, code: "rate_limited", retryDelayMs: 42_000 });
  });
});
