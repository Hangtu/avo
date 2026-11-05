import { describe, expect, it } from "vitest";
import { localPostgresTestTarget } from "./postgres/target";
const local = "postgresql://avo_test:synthetic@127.0.0.1:65432/avo_test_resilience";
describe("real PostgreSQL target guard", () => {
  it("requires explicit confirmation and a dedicated loopback test role/database", () => {
    expect(localPostgresTestTarget(local, "1")).toBe(local);
    expect(() => localPostgresTestTarget(local, undefined)).toThrow("AVO_ALLOW_LOCAL_POSTGRES_TESTS");
  });
  it.each([
    "postgresql://avo_test:synthetic@ep-example.aws.neon.tech/avo_test_resilience",
    "postgresql://avo_test:synthetic@127.0.0.1/production",
    "postgresql://application:synthetic@127.0.0.1/avo_test_resilience",
    `${local}?host=ep-example.aws.neon.tech`,
    `${local}?options=-csearch_path=public`,
    undefined,
  ])("refuses application/remote/ambiguous targets before connecting", (value) => {
    expect(() => localPostgresTestTarget(value, "1")).toThrow();
  });
});
