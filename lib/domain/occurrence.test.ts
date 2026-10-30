import { describe, expect, it } from "vitest";
import { dateFromOccurrenceId, occurrenceIdFor } from "./occurrence";
import { MONDAY } from "@/tests/fixtures";

describe("identidad de ocurrencia", () => {
  it("recupera la fecha aunque el taskId contenga @", () => {
    const id = occurrenceIdFor("a@b", MONDAY);
    expect(id).toBe("a%40b@2026-10-26");
    expect(dateFromOccurrenceId(id)).toBe(MONDAY);
  });

  it("rechaza un id sin fecha", () => {
    expect(() => dateFromOccurrenceId("sin-fecha")).toThrow("fecha");
  });
});
