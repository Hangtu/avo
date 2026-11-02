import { describe, expect, it } from "vitest";
import { firstNameFromFullName } from "./person-name";

describe("firstNameFromFullName", () => {
  it("shows the first name without surnames", () => {
    expect(firstNameFromFullName("Hang Wong Ley Fra")).toBe("Hang");
  });

  it("trims and handles repeated whitespace", () => {
    expect(firstNameFromFullName("  Hang\t Wong  ")).toBe("Hang");
  });

  it("returns undefined for an empty name", () => {
    expect(firstNameFromFullName("   ")).toBeUndefined();
    expect(firstNameFromFullName(null)).toBeUndefined();
  });
});
