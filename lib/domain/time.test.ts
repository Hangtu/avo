import { describe, expect, it } from "vitest";
import {
  clockMinutes,
  localClockMinutes,
  parseClockTime,
  parseLocalDate,
  toLocalDate,
  weekdayOf,
} from "./time";

describe("fechas y horarios locales", () => {
  it("acepta días reales, incluido un año bisiesto", () => {
    expect(parseLocalDate("2024-02-29")).toBe("2024-02-29");
    expect(parseLocalDate("2026-10-26")).toBe("2026-10-26");
  });

  it.each(["2025-02-29", "2026-02-30", "2026-13-01", "2026-00-10", "0000-01-01", "2026-1-1"])(
    "rechaza una fecha inválida: %s",
    (value) => expect(() => parseLocalDate(value)).toThrow(),
  );

  it("resuelve días de la semana sin depender de la zona horaria", () => {
    expect(weekdayOf(parseLocalDate("2026-10-26"))).toBe(1);
    expect(weekdayOf(parseLocalDate("2026-11-01"))).toBe(0);
  });

  it("utiliza el calendario local a ambos lados de medianoche", () => {
    expect(toLocalDate(new Date(2026, 9, 26, 23, 59).getTime())).toBe("2026-10-26");
    expect(toLocalDate(new Date(2026, 9, 27, 0, 1).getTime())).toBe("2026-10-27");
    expect(localClockMinutes(new Date(2026, 9, 26, 18, 5).getTime())).toBe(1085);
  });

  it("convierte horas válidas a minutos", () => {
    expect(parseClockTime("00:00")).toBe("00:00");
    expect(clockMinutes("18:30")).toBe(1110);
    expect(clockMinutes("23:59")).toBe(1439);
  });

  it.each(["24:00", "18:60", "6:00", "-1:00", "18:00:01", "hora"])(
    "rechaza una hora inválida: %s",
    (value) => expect(() => parseClockTime(value)).toThrow(),
  );

  it("rechaza relojes inválidos en vez de producir fechas corruptas", () => {
    expect(() => toLocalDate(Number.NaN)).toThrow();
    expect(() => toLocalDate(Number.POSITIVE_INFINITY)).toThrow();
  });
});
