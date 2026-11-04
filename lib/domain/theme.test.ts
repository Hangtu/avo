import { describe, expect, it } from "vitest";
import { isNightHour, resolveTheme } from "./theme";

const at = (hour: number, minute = 0) => new Date(2026, 9, 30, hour, minute, 0, 0).getTime();

describe("tema automático", () => {
  it("entra en noche a las 20:00 y vuelve a claro a las 07:00", () => {
    expect(resolveTheme("auto", at(19, 59))).toBe("light");
    expect(resolveTheme("auto", at(20, 0))).toBe("dark");
    expect(resolveTheme("auto", at(6, 59))).toBe("dark");
    expect(resolveTheme("auto", at(7, 0))).toBe("light");
  });

  it("respeta una elección manual de día o noche", () => {
    expect(resolveTheme("light", at(22, 0))).toBe("light");
    expect(resolveTheme("dark", at(12, 0))).toBe("dark");
  });

  it("reconoce las horas de noche", () => {
    expect(isNightHour(20)).toBe(true);
    expect(isNightHour(23)).toBe(true);
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(6)).toBe(true);
    expect(isNightHour(7)).toBe(false);
    expect(isNightHour(19)).toBe(false);
  });
});
