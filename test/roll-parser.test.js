import { describe, it, expect } from "vitest";
import { expandDice, termsFromRolls, inlineRollData } from "../src/foundry/roll-parser.js";
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
    expect(expandDice([term(5, 2), term(7, 3), { faces: undefined, results: [{ result: 1 }] }, term(6, 4)])).toEqual([{ kind: 6, value: 4 }]);
  });

  it("throws a d3 as a d6 showing 1-3", () => {
    const [die] = expandDice([term(3, 2)]);
    expect(die).toEqual({ kind: 6, variant: "d3", value: 2 });
    expect(faceLabel(6, 5, "d3")).toBe("2");
  });

  it("throws Fate dice as d6s with +, blank and − faces", () => {
    const fate = { denomination: "f", faces: 3, results: [{ result: 1 }, { result: 0 }, { result: -1 }] };
    expect(expandDice([fate])).toEqual([
      { kind: 6, variant: "fate", value: 1 },
      { kind: 6, variant: "fate", value: 3 },
      { kind: 6, variant: "fate", value: 6 }
    ]);
  });

  it("recognises Foundry term classes by their DENOMINATION", () => {
    class FateDie {
      static DENOMINATION = "f";
      faces = 3;
      results = [{ result: -1 }];
    }
    expect(expandDice([new FateDie()])).toEqual([{ kind: 6, variant: "fate", value: 6 }]);
  });

  it("throws coins (heads = 1, tails = 0) and plain d2s", () => {
    const coin = { denomination: "c", faces: 2, results: [{ result: 1 }, { result: 0 }] };
    expect(expandDice([coin, term(2, 2)])).toEqual([
      { kind: 2, variant: "coin", value: 1 },
      { kind: 2, variant: "coin", value: 2 },
      { kind: 2, value: 2 }
    ]);
  });

  it("caps the number of dice", () => {
    expect(expandDice([term(6, 1, 2, 3, 4, 5)], { maxDice: 3 })).toHaveLength(3);
    expect(expandDice([term(100, 55)], { maxDice: 1 })).toHaveLength(1);
  });

  it("hides results for rolls the viewer cannot see behind \"?\" faces", () => {
    const dice = expandDice([term(20, 20), term(100, 42), { denomination: "c", faces: 2, results: [{ result: 1 }] }], { hidden: true });
    expect(dice.map(d => d.kind)).toEqual([20, 10, 10, 2]);
    expect(dice.every(d => d.value === null && d.variant === "hidden")).toBe(true);
    expect(faceLabel(20, 7, "hidden")).toBe("?");
  });

  it("collects dice from rolls", () => {
    expect(termsFromRolls([{ dice: [1, 2] }, { dice: [3] }, null])).toEqual([1, 2, 3]);
  });
});

describe("inlineRollData", () => {
  const roll = { class: "Roll", formula: "1d20", terms: [{ class: "Die", faces: 20, results: [{ result: 12, active: true }] }] };

  it("reads escape()-encoded roll data from inline results", () => {
    const html = `<p>Hit: <a class="inline-roll inline-result" data-roll="${escape(JSON.stringify(roll))}">12</a></p>`;
    expect(inlineRollData(html)).toEqual([roll]);
  });

  it("reads URI- and entity-encoded roll data", () => {
    const uri = `<a class="inline-roll" data-roll="${encodeURIComponent(JSON.stringify(roll))}">12</a>`;
    const entities = `<a class="inline-roll" data-roll="${JSON.stringify(roll).replace(/"/g, "&quot;")}">12</a>`;
    expect(inlineRollData(uri + entities)).toEqual([roll, roll]);
  });

  it("skips private inline rolls unless asked for them", () => {
    const html = `<a class="inline-roll inline-result private" data-roll="${escape(JSON.stringify(roll))}">?</a>`;
    expect(inlineRollData(html)).toEqual([]);
    expect(inlineRollData(html, { includePrivate: true })).toEqual([roll]);
  });

  it("ignores text without inline rolls and broken data", () => {
    expect(inlineRollData("<p>No rolls here</p>")).toEqual([]);
    expect(inlineRollData('<a data-roll="%7Bbroken">x</a>')).toEqual([]);
    expect(inlineRollData(undefined)).toEqual([]);
  });
});
