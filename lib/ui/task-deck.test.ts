import { describe, expect, it } from "vitest";
import {
  DECK_BACK_SCALE,
  deckContentOpacity,
  deckLayer,
  deckPreviewOpacity,
  deckTransform,
  nextDeckAlternative,
  promoteDeckSelection,
  resolveDeckSelection,
} from "./task-deck";

const empty = { primaryId: null, secondaryId: null };

describe("selección visual de las tarjetas de Hoy", () => {
  it("admite una franja vacía o una sola tarjeta", () => {
    expect(resolveDeckSelection([], empty)).toEqual(empty);
    const single = resolveDeckSelection(["a"], empty);
    expect(single).toEqual({ primaryId: "a", secondaryId: null });
    expect(promoteDeckSelection(single)).toBe(single);
    expect(nextDeckAlternative(["a"], single)).toEqual(single);
  });

  it("intercambia las mismas dos tarjetas y permite volver", () => {
    const selection = resolveDeckSelection(["a", "b"], empty);
    expect(promoteDeckSelection(selection)).toEqual({ primaryId: "b", secondaryId: "a" });
    expect(promoteDeckSelection(promoteDeckSelection(selection))).toEqual(selection);
    expect(nextDeckAlternative(["a", "b"], selection)).toEqual(selection);
  });

  it("con tres tareas deja la principal anterior detrás, no la tercera", () => {
    const ids = ["a", "b", "c"];
    const selection = promoteDeckSelection(resolveDeckSelection(ids, empty));
    expect(selection).toEqual({ primaryId: "b", secondaryId: "a" });
    expect(nextDeckAlternative(ids, selection)).toEqual({ primaryId: "b", secondaryId: "c" });
    expect(nextDeckAlternative(ids, nextDeckAlternative(ids, selection))).toEqual(selection);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("conserva la selección por ID aunque cambie el orden de los datos", () => {
    expect(resolveDeckSelection(["c", "b", "a"], {
      primaryId: "b", secondaryId: "a",
    })).toEqual({ primaryId: "b", secondaryId: "a" });
  });

  it("resuelve tarjetas retiradas sin repetir la principal como alternativa", () => {
    expect(resolveDeckSelection(["b", "c"], {
      primaryId: "a", secondaryId: "b",
    })).toEqual({ primaryId: "b", secondaryId: "c" });
    expect(resolveDeckSelection(["a", "b"], {
      primaryId: "a", secondaryId: "a",
    })).toEqual({ primaryId: "a", secondaryId: "b" });
  });
});

describe("recorrido coordinado del carrusel", () => {
  const transform = (role: "front" | "back", progress: number) =>
    deckTransform(role, progress, 600, 300, 100);

  it("termina exactamente en el reposo de la otra tarjeta, sin salto al confirmar", () => {
    expect(transform("front", 1)).toBe(transform("back", 0));
    expect(transform("back", 1)).toBe(transform("front", 0));
    expect(transform("front", 0)).toContain("translate3d(0px, 0px, 0) scale(1)");
  });

  it("recorre lados opuestos y compensa la altura de la tarjeta posterior", () => {
    expect(transform("front", 0.5)).toMatch(/^translate3d\(28px,/);
    expect(transform("back", 0.5)).toMatch(/^translate3d\(-28px,/);
    const y = Number(transform("back", 0).match(/, ([\d.]+)px, 0\)/)?.[1]);
    expect(y + 300 * DECK_BACK_SCALE).toBeCloseTo(400);
  });

  it("suaviza también el arranque y el frenado del arco lateral", () => {
    for (const progress of [0.001, 0.999]) {
      const x = Number(transform("front", progress).match(/^translate3d\(([-\d.e]+)px/)?.[1]);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(0.001);
    }
  });

  it("limita el recorrido lateral en pantallas estrechas", () => {
    const value = deckTransform("back", 0.5, 280, 320, 120);
    const x = Number(value.match(/^translate3d\(([-\d.]+)px/)?.[1]);
    expect(x).toBeCloseTo(-16.8);
    expect(value).not.toMatch(/NaN|Infinity/);
  });

  it("intercambia las capas a mitad del recorrido", () => {
    expect(deckLayer("front", 0)).toBeGreaterThan(deckLayer("back", 0));
    expect(deckLayer("front", 0.49)).toBeGreaterThan(deckLayer("back", 0.49));
    expect(deckLayer("back", 0.5)).toBeGreaterThan(deckLayer("front", 0.5));
    expect(deckLayer("back", 1)).toBeGreaterThan(deckLayer("front", 1));
    expect(deckLayer("hidden", 0.5)).toBe(0);
  });

  it("cambia el contenido sin desvanecer las superficies de las tarjetas", () => {
    expect(deckContentOpacity("front", 0)).toBe(1);
    expect(deckContentOpacity("back", 0)).toBe(0);
    expect(deckContentOpacity("front", 1)).toBe(0);
    expect(deckContentOpacity("back", 1)).toBe(1);
    expect(deckContentOpacity("front", 0.3)).toBeGreaterThan(0);
    expect(deckContentOpacity("front", 0.3)).toBeLessThan(1);
    expect(deckContentOpacity("back", 0.6)).toBeGreaterThan(0);
    expect(deckContentOpacity("back", 0.6)).toBeLessThan(1);
    expect(deckContentOpacity("hidden", 0.5)).toBe(0);
  });

  it("no superpone la vista completa y el resumen dentro de la misma tarjeta", () => {
    for (const role of ["front", "back"] as const) {
      for (let step = 0; step <= 100; step++) {
        const progress = step / 100;
        expect(deckContentOpacity(role, progress) * deckPreviewOpacity(role, progress)).toBe(0);
      }
    }
    expect(deckPreviewOpacity("front", 0)).toBe(0);
    expect(deckPreviewOpacity("front", 1)).toBe(1);
    expect(deckPreviewOpacity("back", 0)).toBe(1);
    expect(deckPreviewOpacity("back", 1)).toBe(0);
    expect(deckPreviewOpacity("hidden", 0.5)).toBe(0);
  });
});
