import { describe, expect, it } from "vitest";
import type { TaskInput } from "./types";
import { defaultSettings, validatePendingInput, validateSettings, validateTaskInput } from "./validation";
import { NOW, taskInput } from "@/tests/fixtures";

describe("validación de tareas", () => {
  it("limpia espacios/días duplicados sin mutar el formulario", () => {
    const input = taskInput({ title: "  Ropa  ", days: [3, 1, 1] });
    const result = validateTaskInput(input);
    expect(result.title).toBe("Ropa");
    expect(result.days).toEqual([1, 3]);
    expect(input.days).toEqual([3, 1, 1]);
    result.shortStep!.title = "Cambiado";
    expect(input.shortStep!.title).toBe("Meter ropa a la lavadora");
  });

  it("exige al menos un día para un hábito", () => {
    expect(() => validateTaskInput(taskInput({ days: [] }))).toThrow(/al menos un día/i);
  });

  it.each([
    { title: " " }, { category: "" }, { durationMin: 0 },
    { durationMin: -1 }, { durationMin: 1.5 }, { durationMin: Number.NaN },
    { durationMin: Number.POSITIVE_INFINITY }, { durationMin: Number.MAX_SAFE_INTEGER },
    { priority: 0 }, { priority: 4 }, { days: [] }, { days: [7] }, { days: [-1] },
    { shortStep: { title: "", durationMin: 1 } },
    { shortStep: { title: "Paso", durationMin: 0 } },
    { shortStep: { title: "Paso", durationMin: 15 } },
    { shortStep: { title: "Paso", durationMin: 20 } },
    { window: { start: "18:00", end: "18:00" } },
    { window: { start: "22:00", end: "06:00" } },
    { fixedTime: "24:00" },
    { fixedTime: "17:59", window: { start: "18:00", end: "18:30" } },
    { fixedTime: "18:30", window: { start: "18:00", end: "18:30" } },
  ])("rechaza una entrada inválida: %j", (patch) => {
    expect(() => validateTaskInput(taskInput(patch as Partial<TaskInput>))).toThrow();
  });

  it("admite una hora fija al inicio de su franja y excluye el límite final", () => {
    const task = taskInput({
      fixedTime: "18:00",
      window: { start: "18:00", end: "18:30" },
    });
    expect(validateTaskInput(task).fixedTime).toBe("18:00");
  });
});

describe("validación de pendientes", () => {
  it("recorta el nombre y conserva los minutos enteros", () => {
    const input = { title: "  Pagar las cuentas  ", durationMin: 25 };
    const result = validatePendingInput(input);
    expect(result).toEqual({ title: "Pagar las cuentas", durationMin: 25 });
    expect(input.title).toBe("  Pagar las cuentas  ");
  });

  it.each([
    { title: "" }, { title: "  " }, { durationMin: 0 }, { durationMin: -1 },
    { durationMin: 1.5 }, { durationMin: Number.NaN }, { durationMin: Number.MAX_SAFE_INTEGER },
  ])("rechaza un pendiente inválido: %j", (patch) => {
    expect(() => validatePendingInput({ title: "Algo", durationMin: 25, ...patch })).toThrow();
  });
});

describe("preferencias", () => {
  it("arranca sin audio, tema automático y techo de tono 2", () => {
    expect(defaultSettings(NOW)).toMatchObject({
      audioEnabled: false, maxTone: 2, theme: "auto", showWallet: false,
    });
  });

  it("no admite nivel 3 en el MVP ni preferencias corruptas", () => {
    expect(() => validateSettings({ ...defaultSettings(NOW), maxTone: 3 } as never)).toThrow();
    expect(() => validateSettings({ ...defaultSettings(NOW), theme: "otro" } as never)).toThrow();
    expect(() => validateSettings({ ...defaultSettings(NOW), showWallet: "sí" } as never)).toThrow();
  });

  it.each(["brown", "pink", "rain", "ocean", "tick"] as const)(
    "acepta el sonido %s", (sound) => {
      expect(validateSettings({ ...defaultSettings(NOW), sound }).sound).toBe(sound);
    },
  );

  it("rechaza un sonido fuera del catálogo", () => {
    expect(() => validateSettings({ ...defaultSettings(NOW), sound: "cafe" } as never)).toThrow();
  });
});
