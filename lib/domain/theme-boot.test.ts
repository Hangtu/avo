import { describe, expect, it } from "vitest";

import { SPACE_STORAGE_KEYS, storageKeyForSpace } from "@/lib/db/local-space";
import { ACCESS_KEY } from "@/lib/sync/access-marker";
import { DARK_THEME_COLOR, LIGHT_THEME_COLOR } from "./theme";
import { themeBootScript } from "./theme-boot";

const GUEST_KEY = SPACE_STORAGE_KEYS.theme;
const ACCOUNT = { accountId: "user-1", locked: false };
const SCOPED_KEY = storageKeyForSpace({ kind: "account", userId: ACCOUNT.accountId }, SPACE_STORAGE_KEYS.theme);

/** Execute the real pre-paint script against synthetic browser objects. */
function run(entries: Record<string, string>) {
  const asked: string[] = [];
  const storage = {
    getItem: (key: string) => {
      asked.push(key);
      return entries[key] ?? null;
    },
  };
  const dataset: Record<string, string> = {};
  const style: Record<string, string> = {};
  const meta = {
    content: "",
    setAttribute(name: string, value: string) {
      if (name === "content") this.content = value;
    },
  };
  const document = { documentElement: { dataset, style }, querySelector: () => meta };
  new Function("localStorage", "document", themeBootScript())(storage, document);
  return { theme: dataset.theme, colorScheme: style.colorScheme, meta, asked };
}

describe("pre-paint theme is scoped to the selected space", () => {
  it("keeps the historical guest key when no account marker exists", () => {
    const result = run({ [GUEST_KEY]: "dark" });
    expect(result.theme).toBe("dark");
    expect(result.colorScheme).toBe("dark");
    expect(result.meta.content).toBe(DARK_THEME_COLOR);
  });
  it("reads the account's own mirror and never the guest value", () => {
    const result = run({ [ACCESS_KEY]: JSON.stringify(ACCOUNT), [SCOPED_KEY]: "light", [GUEST_KEY]: "dark" });
    expect(result.theme).toBe("light");
    expect(result.meta.content).toBe(LIGHT_THEME_COLOR);
    expect(result.asked).toContain(SCOPED_KEY);
    expect(result.asked).not.toContain(GUEST_KEY);
  });
  it("does not adopt the guest mirror for an account that has none yet", () => {
    const result = run({ [ACCESS_KEY]: JSON.stringify(ACCOUNT), [GUEST_KEY]: "dark" });
    expect(result.asked).toContain(SCOPED_KEY);
    expect(result.asked).not.toContain(GUEST_KEY);
    expect(["light", "dark"]).toContain(result.theme);
  });
  it("falls back to the guest key while the local copy is locked", () => {
    const locked = { accountId: "user-1", locked: true };
    const result = run({ [ACCESS_KEY]: JSON.stringify(locked), [SCOPED_KEY]: "light", [GUEST_KEY]: "dark" });
    expect(result.theme).toBe("dark");
    expect(result.asked).not.toContain(SCOPED_KEY);
  });
  it("never throws on a malformed marker or denied storage", () => {
    expect(run({ [ACCESS_KEY]: "{" }).theme).toBeDefined();
    const document = { documentElement: { dataset: {} as Record<string, string>, style: {} as Record<string, string> }, querySelector: () => null };
    expect(() => new Function("localStorage", "document", themeBootScript())({
      getItem: () => {
        throw new Error("denied");
      },
    }, document)).not.toThrow();
  });
});
