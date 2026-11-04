import { afterEach, describe, expect, it, vi } from "vitest";

import { newLockedSpaceName, newOperationId, stableDigest } from "./id";

/** Same shape the wire protocol requires for receipts and retries. */
const V4 = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

afterEach(() => vi.unstubAllGlobals());

describe("local identifiers — no reliance on a secure context", () => {
  it("keeps the v4 shape required by the protocol and never repeats", () => {
    const first = newOperationId(),
      second = newOperationId();
    expect(first).toMatch(V4);
    expect(second).toMatch(V4);
    expect(first).not.toBe(second);
  });
  it("works on an insecure LAN origin where randomUUID is missing", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        for (let index = 0; index < bytes.length; index += 1) bytes[index] = (index * 37 + 11) & 0xff;
        return bytes;
      },
    });
    expect(newOperationId()).toMatch(V4);
  });
  it("still produces an id when crypto is entirely unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    expect(newOperationId()).toMatch(V4);
  });
  it("names transient locked spaces that are never opened or synced", () => {
    const name = newLockedSpaceName();
    expect(name.startsWith("runo-locked-")).toBe(true);
    expect(name.slice("runo-locked-".length)).toMatch(V4);
  });
  it("derives deterministic import ids regardless of runtime crypto support", () => {
    expect(stableDigest("guest:task:1")).toBe(stableDigest("guest:task:1"));
    expect(stableDigest("guest:task:1")).toMatch(/^[\da-f]{32}$/);
    expect(stableDigest("guest:task:1")).not.toBe(stableDigest("guest:task:2"));
    expect(stableDigest("guest:task:1")).not.toBe(stableDigest("guest:pending:1"));
  });
});
