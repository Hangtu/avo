import { afterEach, describe, expect, it, vi } from "vitest";
import { authOrigins } from "./auth-origins";
afterEach(() => vi.unstubAllEnvs());
describe("development auth origins never widen production", () => {
  it("permits only the base origin in production even with a configured development origin", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("BETTER_AUTH_URL", "https://avo.example.test"); vi.stubEnv("AVO_DEV_AUTH_ORIGINS", "http://192.168.68.109:3000");
    expect(authOrigins()).toEqual(["https://avo.example.test"]);
  });
  it("uses exact explicit development origins rather than HMR host matching", () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000"); vi.stubEnv("AVO_DEV_AUTH_ORIGINS", "http://192.168.68.109:3000");
    expect(authOrigins()).toEqual(["http://localhost:3000", "http://192.168.68.109:3000"]);
    expect(authOrigins()).not.toContain("http://192.168.68.109:3001");
  });
  it.each(["*", "http://192.168.68.109:3000/path", "http://user:password@192.168.68.109:3000"])("fails closed for malformed origin %s", value => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("AVO_DEV_AUTH_ORIGINS", value);
    expect(() => authOrigins()).toThrow();
  });
});
