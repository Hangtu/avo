import { describe, expect, it } from "vitest";
import { blockForTime, windowPreset } from "./schedule";

describe("bloques del editor", () => {
  it("solo reconoce un preset cuando coinciden sus dos extremos", () => {
    expect(windowPreset("05:00", "12:00")).toBe("morning");
    expect(windowPreset("12:00", "19:00")).toBe("afternoon");
    expect(windowPreset("19:00", "23:59")).toBe("night");
    expect(windowPreset("18:00", "18:30")).toBe("custom");
    expect(windowPreset("06:00", "12:00")).toBe("custom");
    expect(windowPreset("00:00", "05:00")).toBe("custom");
  });

  it("agrupa la lista por la hora visible de la tarea", () => {
    expect(blockForTime(null)).toBe("any");
    expect(blockForTime("04:59")).toBe("night");
    expect(blockForTime("05:00")).toBe("morning");
    expect(blockForTime("11:59")).toBe("morning");
    expect(blockForTime("12:00")).toBe("afternoon");
    expect(blockForTime("18:59")).toBe("afternoon");
    expect(blockForTime("19:00")).toBe("night");
  });
});
