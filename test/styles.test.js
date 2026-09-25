import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { BUILTIN_STYLES, SARGAS_STYLES, COLLECTIONS } from "../src/styles/index.js";
import { CLASSIC_STYLES } from "../src/styles/classic.js";
import { validateStyle, registerStyle, getStyles } from "../src/styles/registry.js";

const lang = JSON.parse(fs.readFileSync(new URL("../lang/en.json", import.meta.url)));

describe("built-in styles", () => {
  it("has the 14 Sargas styles and 8 Classic sets, with unique ids", () => {
    expect(SARGAS_STYLES).toHaveLength(14);
    expect(CLASSIC_STYLES).toHaveLength(8);
    expect(BUILTIN_STYLES).toHaveLength(22);
    expect(new Set(BUILTIN_STYLES.map(s => s.id)).size).toBe(22);
  });

  it("puts every built-in style in a known collection", () => {
    const ids = COLLECTIONS.map(c => c.id);
    for (const s of BUILTIN_STYLES) expect(ids).toContain(s.collection);
  });

  it("makes the Classic sets small, rounded casino-style dice", () => {
    for (const s of CLASSIC_STYLES) {
      expect(s.shape).toBe("rounded");
      expect(s.size).toBeLessThan(1);
      expect(s.pips.color.toLowerCase()).toBe("#fbf8f6");
    }
  });

  for (const style of BUILTIN_STYLES) {
    it(`${style.id} is valid and translated`, () => {
      expect(validateStyle(style)).toEqual([]);
      const key = style.label.split(".").slice(1);
      expect(key.reduce((o, k) => o?.[k], lang.SARGAS)).toBe(style.name);
    });
  }

  it("registers styles and rejects bad ones", () => {
    registerStyle({ id: "test-style", name: "Test", body: { color: "#fff" }, pips: { kind: "paint", color: "#000" }, sound: "wood" });
    expect(getStyles().some(s => s.id === "test-style")).toBe(true);
    expect(() => registerStyle({ id: "Bad Id", body: {}, pips: {} })).toThrow(/Invalid dice style/);
    const base = { id: "x", name: "X", body: { color: "#fff" }, pips: { kind: "paint", color: "#000" }, sound: "wood" };
    expect(validateStyle({ ...base, shape: "sphere" })).toContain('shape must be "rounded" or left out');
    expect(validateStyle({ ...base, size: 3 })).toContain("size must be between 0.4 and 1.5");
  });
});
