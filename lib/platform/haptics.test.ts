import { describe, expect, it, vi } from "vitest";
import { HAPTIC_PATTERNS, pulse, vibrate } from "./haptics";

describe("vibración opcional", () => {
  it("no falla cuando no existe soporte", () => {
    expect(vibrate([120], null)).toBe(false);
    expect(vibrate([120], {})).toBe(false);
    expect(pulse("timer", {})).toBe(false);
  });

  it("llama al patrón y devuelve true cuando el navegador responde", () => {
    const target = { vibrate: vi.fn(() => true) };
    expect(vibrate([120, 80], target)).toBe(true);
    expect(target.vibrate).toHaveBeenCalledWith([120, 80]);
    expect(pulse("anchor", target)).toBe(true);
    expect(target.vibrate).toHaveBeenLastCalledWith(HAPTIC_PATTERNS.anchor);
  });

  it("trata una respuesta false como no disponible", () => {
    expect(vibrate([60], { vibrate: () => false })).toBe(false);
  });

  it("captura una excepción del navegador", () => {
    expect(vibrate([60], { vibrate: () => { throw new Error("blocked"); } })).toBe(false);
    expect(pulse("timer", { vibrate: () => { throw new Error("blocked"); } })).toBe(false);
  });
});
