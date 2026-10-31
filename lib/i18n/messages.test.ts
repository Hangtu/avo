import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { defaultLocale, intlLocales, isLocale, locales } from "./config";

interface Tree {
  [key: string]: string | Tree;
}

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result.set(path, value);
    else for (const [child, text] of flatten(value, path)) result.set(child, text);
  }
  return result;
}

describe("catálogo de mensajes", () => {
  const spanish = flatten(es as Tree);
  const english = flatten(en as Tree);

  it("tiene las mismas claves en español e inglés", () => {
    expect([...spanish.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("no deja textos vacíos", () => {
    for (const [key, value] of [...spanish, ...english]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("tiene dos idiomas y formatos locales definidos", () => {
    expect(locales).toEqual(["es", "en"]);
    expect(defaultLocale).toBe("es");
    expect(intlLocales.es).toBe("es-MX");
    expect(intlLocales.en).toBe("en-US");
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});
