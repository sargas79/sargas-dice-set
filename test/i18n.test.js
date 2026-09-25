import { describe, it, expect } from "vitest";
import fs from "node:fs";

const read = p => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const manifest = read("module.json");

/** Flatten nested keys: {a: {b: "x"}} -> ["a.b"]. */
const keys = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort();

const english = keys(read("lang/en.json"));

describe("translations", () => {
  for (const { lang, path } of manifest.languages) {
    it(`${lang} has every key, and only known keys`, () => {
      const file = read(path);
      expect(keys(file)).toEqual(english);
      // Placeholders must survive translation.
      expect(file.SARGAS.Notify.Fallback).toContain("{style}");
    });
  }

  it("ships every language file that exists", () => {
    const files = fs.readdirSync(new URL("../lang", import.meta.url)).map(f => `lang/${f}`).sort();
    expect(manifest.languages.map(l => l.path).sort()).toEqual(files);
  });
});
