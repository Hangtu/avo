import { describe, expect, it } from "vitest";
import { directMigrationUrl } from "./migration-url";

describe("direct migration target", () => {
  it("accepts explicit direct/local PostgreSQL URLs without exposing credentials", () => {
    const value =
      "postgresql://synthetic:synthetic@ep-example.aws.neon.tech/avo?sslmode=verify-full&channel_binding=require";
    expect(directMigrationUrl(value)).toBe(value);
    expect(directMigrationUrl("postgres://synthetic:synthetic@127.0.0.1:5432/avo_test")).toContain(
      "127.0.0.1",
    );
  });
  it.each([
    undefined,
    "",
    "  ",
    "not a URL",
    "https://example.test/avo",
    "postgresql://synthetic:synthetic@ep-example-pooler.aws.neon.tech/avo",
    "postgresql://synthetic:synthetic@localhost",
    "postgresql://synthetic:synthetic@localhost/avo?host=ep-pooled-pooler.aws.neon.tech",
    "postgresql://synthetic:synthetic@localhost/avo?database=another",
  ])("rejects missing/pooled/overridden targets without printing values", (input) => {
    expect(() => directMigrationUrl(input)).toThrow();
    try {
      directMigrationUrl(input);
    } catch (error) {
      expect(String(error)).not.toContain("synthetic:synthetic");
    }
  });
});
