import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { BUILTIN_STYLES, SARGAS_STYLES, COLLECTIONS } from "../src/styles/index.js";
import { CLASSIC_STYLES } from "../src/styles/classic.js";
import { ORACLE_STYLES } from "../src/styles/oracle.js";
import { validateStyle, registerStyle, getStyles } from "../src/styles/registry.js";

const lang = JSON.parse(fs.readFileSync(new URL("../lang/en.json", import.meta.url)));

describe("built-in styles", () => {
  it("has the 14 Sargas styles, 7 Oracle finishes and 8 Classic sets, with unique ids", () => {
    expect(SARGAS_STYLES).toHaveLength(14);
    expect(ORACLE_STYLES).toHaveLength(7);
    expect(CLASSIC_STYLES).toHaveLength(8);
    expect(BUILTIN_STYLES).toHaveLength(29);
    expect(new Set(BUILTIN_STYLES.map(s => s.id)).size).toBe(29);
  });

  it("builds the Oracle finishes from the design", () => {
    expect(ORACLE_STYLES.map(s => s.name)).toEqual(["Brass Ward", "Midnight Ledger", "Specimen Resin", "Containment Steel", "Archivist", "Sigil", "Drowned Idol"]);
    for (const s of ORACLE_STYLES) {
      expect(s.collection).toBe("oracle");
      expect(s.shape).toBe("rounded");
      expect(typeof s.drawMarks).toBe("function");
    }
    // Corner radius follows the design (13, 12 and 20 of 100 units).
    expect(ORACLE_STYLES.find(s => s.id === "oracle-brass").roundness).toBe(0.26);
    expect(ORACLE_STYLES.find(s => s.id === "oracle-resin").roundness).toBe(0.4);
    // Pip colours from the design's swatches.
    expect(ORACLE_STYLES.find(s => s.id === "oracle-brass").pips.color).toBe("#3fe3ad");
    expect(ORACLE_STYLES.find(s => s.id === "oracle-sigil").pips.color).toBe("#5ff0df");
  });

  it("draws d6/d3 pips and d4-d100 numbers itself, leaving coins and Fate/\"?\" d6s to the defaults", () => {
    const s = ORACLE_STYLES[0];
    const calls = [];
    const p = { apply: () => calls.push(1), transform: (x, y, r, fn) => fn(), strokePath: () => calls.push(1) };
    const face = (kind, value, variant) => ({ kind, value, variant, cx: 50, cy: 50, inradius: 20, fullPolygon: [[0, 0]] });
    expect(s.drawMarks(p, face(6, 3))).toBe(true);
    expect(s.drawMarks(p, face(6, 5, "d3"))).toBe(true);
    for (const f of [face(20, 7), face(12, 9), face(10, 4, "tens"), face(8, 1), face(20, 3, "hidden")]) expect(s.drawMarks(p, f)).toBe(true);
    for (const f of [face(6, 1, "fate"), face(6, 2, "hidden"), face(2, 1, "coin")]) expect(s.drawMarks(p, f)).toBe(false);
    expect(calls.length).toBeGreaterThan(0);
  });

  it("ships the design's number font", () => {
    for (const s of ORACLE_STYLES) expect(s.fonts).toEqual([{ family: "Cormorant SC", weight: 700, file: "fonts/CormorantSC-Bold.woff2" }]);
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
    expect(validateStyle({ ...base, roundness: 0.9 })).toContain("roundness must be between 0.05 and 0.6");
  });
});

describe("Oracle design artwork", async () => {
  const { designFaceSvg, DESIGN_FINISHES } = await import("../src/styles/oracle-design.js");
  const { ORACLE_STYLES } = await import("../src/styles/oracle.js");

  it("fills in the design's face markup for every finish and value", () => {
    expect(Object.keys(DESIGN_FINISHES).sort()).toEqual(["archivist", "brass", "drowned", "ledger", "resin", "sigil", "steel"]);
    for (const key of Object.keys(DESIGN_FINISHES)) {
      for (let v = 1; v <= 6; v++) {
        const svg = designFaceSvg(key, v, 256);
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100">')).toBe(true);
        expect(svg.endsWith("</svg>")).toBe(true);
        // Six pip slots, each with rim, gradient pip, eye slit and highlight; unused slots sit off-face with r=0.
        expect(svg.match(/<circle /g)).toHaveLength(18);
        expect(svg.match(/<ellipse /g)).toHaveLength(7);
        expect(svg.match(/ r="0"/g)?.length ?? 0).toBe((6 - v) * 3);
        expect(svg).toContain(`stop-color="${DESIGN_FINISHES[key].body1}"`);
        expect(svg).toContain(`d="${DESIGN_FINISHES[key].pattern}"`);
      }
    }
  });

  it("uses the design's exact values", () => {
    const brass = designFaceSvg("brass", 1);
    expect(brass).toContain('rx="13"');
    expect(brass).toContain('stroke-width="7"');
    expect(brass).toContain('<rect x="3.5" y="3.5" width="93" height="93" rx="9.5"');
    expect(brass).toContain('<circle cx="50" cy="50" r="6.6" fill="url(#d-brass-1-pip)"/>');
    expect(designFaceSvg("resin", 2)).toContain('<feGaussianBlur stdDeviation="3.2"/>');
    expect(designFaceSvg("sigil", 3)).toContain("M50 15 L80.3 67.5 L19.7 67.5 Z");
    // Drowned Idol: tentacles in all four corners and slit-pupil eyes.
    const drowned = designFaceSvg("drowned", 1);
    expect(drowned).toContain("M 3.00 38.00 C 14.00 33.00");
    expect(drowned).toContain("M 62.00 3.00");
    expect(drowned).toMatch(/<ellipse cx="50" cy="50" rx="1\.44\d*" ry="5\.616\d*" fill="#081006" opacity="1"\/>/);
  });

  it("follows the design's polyhedral labels", async () => {
    const { designPolyLabel, DESIGN_POLY_FINISHES } = await import("../src/styles/oracle-design.js");
    expect(designPolyLabel("d20", 6)).toBe("6.");
    expect(designPolyLabel("d12", 9)).toBe("9.");
    expect(designPolyLabel("d10", 6)).toBe("6.");
    expect(designPolyLabel("d8", 6)).toBe("6");
    expect(designPolyLabel("d4", 3)).toBe("3");
    expect(designPolyLabel("d100", 0)).toBe("00");
    expect(designPolyLabel("d100", 60)).toBe("60");
    expect(Object.keys(DESIGN_POLY_FINISHES)).toHaveLength(7);
    expect(DESIGN_POLY_FINISHES.brass).toMatchObject({ edge: "#c9a55a", num: "#3fe3ad", numStroke: "#6b4f1f" });
    expect(DESIGN_POLY_FINISHES.sigil.ringOn).toBe(1);
  });

  it("gives every Oracle style its face artwork", () => {
    for (const s of ORACLE_STYLES) expect(s.faceSvg(4, 128)).toBe(designFaceSvg(s.id.replace("oracle-", ""), 4, 128));
  });
});
