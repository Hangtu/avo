import { describe, expect, it } from "vitest";
import { developmentHosts, reportOnlyCsp } from "./security";

describe("diagnostic CSP", () => {
  it("has strict production directives without nonce/PPR or unsafe script bypasses", () => {
    const policy = reportOnlyCsp(false);
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "worker-src 'self'",
    ])
      expect(policy).toContain(directive);
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|nonce-|report-uri|report-to|https?:|\*/);
    expect(policy).not.toMatch(/[\r\n]/);
  });
  it("keeps development eval/websocket exceptions out of production", () => {
    expect(reportOnlyCsp(true)).toContain("'unsafe-eval'");
    expect(reportOnlyCsp(true)).toContain("ws: wss:");
    expect(reportOnlyCsp(false)).not.toContain("ws:");
  });
});

describe("opt-in development hosts", () => {
  it("defaults to empty and ignores even malformed values outside development", () => {
    expect(developmentHosts(undefined, "development")).toEqual([]);
    expect(developmentHosts("  ", "development")).toEqual([]);
    expect(developmentHosts("*", "production")).toEqual([]);
    expect(developmentHosts("localhost", "test")).toEqual([]);
  });
  it("normalizes exact hosts and deduplicates them", () => {
    expect(developmentHosts("192.0.2.10, Dev.Example.test,192.0.2.10", "development")).toEqual([
      "192.0.2.10",
      "dev.example.test",
    ]);
  });
  it.each([
    "*",
    "*.example.test",
    "http://example.test",
    "example.test:3000",
    "user@example.test",
    "example.test/path",
    "example.test?x=1",
    "example.test#fragment",
    "bad host",
    "127.1",
    "example.test:80",
  ])("rejects ambiguous/non-host input %s", (input) => {
    expect(() => developmentHosts(input, "development")).toThrow("Invalid AVO_DEV_HOSTS");
  });
});
