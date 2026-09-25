import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { BUILTIN_STYLES } from "../src/styles/index.js";
import { validateStyle, registerStyle, getStyles } from "../src/styles/registry.js";

const lang = JSON.parse(fs.readFileSync(new URL("../lang/en.json", import.meta.url)));

describe("built-in styles", () => {
  it("has the 14 mockup styles with unique ids", () => {
    expect(BUILTIN_STYLES).toHaveLength(14);
    expect(new Set(BUILTIN_STYLES.map(s => s.id)).size).toBe(14);
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
  });
});
