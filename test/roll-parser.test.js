import { describe, it, expect } from "vitest";
import { expandDice, termsFromRolls } from "../src/foundry/roll-parser.js";
import { faceLabel } from "../src/engine/textures/faces.js";

const term = (faces, ...results) => ({ faces, results: results.map(result => ({ result })) });

describe("expandDice", () => {
  it("expands each result into a die", () => {
    expect(expandDice([term(20, 17), term(6, 3, 5)])).toEqual([
      { kind: 20, value: 17 },
      { kind: 6, value: 3 },
      { kind: 6, value: 5 }
    ]);
  });

  it("splits d100 into a tens die and a units die", () => {
    const show = r => {
      const [tens, units] = expandDice([term(100, r)]);
      expect(tens).toMatchObject({ kind: 10, variant: "tens" });
      return faceLabel(10, tens.value, "tens") + "+" + faceLabel(10, units.value);
    };
    expect(show(1)).toBe("00+1");
    expect(show(10)).toBe("10+0");
    expect(show(47)).toBe("40+7");
    expect(show(90)).toBe("90+0");
    expect(show(100)).toBe("00+0");
  });

  it("skips unsupported dice", () => {
    expect(expandDice([term(3, 2), { faces: undefined, results: [{ result: 1 }] }, term(6, 4)])).toEqual([{ kind: 6, value: 4 }]);
  });

  it("caps the number of dice", () => {
    expect(expandDice([term(6, 1, 2, 3, 4, 5)], { maxDice: 3 })).toHaveLength(3);
    expect(expandDice([term(100, 55)], { maxDice: 1 })).toHaveLength(1);
  });

  it("hides results for rolls the viewer cannot see", () => {
    expect(expandDice([term(20, 20), term(100, 42)], { hidden: true }).every(d => d.value === null)).toBe(true);
  });

  it("collects dice from rolls", () => {
    expect(termsFromRolls([{ dice: [1, 2] }, { dice: [3] }, null])).toEqual([1, 2, 3]);
  });
});
