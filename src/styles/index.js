import { registerStyle } from "./registry.js";
import vintageBone from "./vintage-bone.js";
import obsidianGold from "./obsidian-gold.js";
import smokeGlass from "./smoke-glass.js";
import rivetedSteel from "./riveted-steel.js";
import oxbloodSeal from "./oxblood-seal.js";
import crackedPorcelain from "./cracked-porcelain.js";
import amberMoth from "./amber-moth.js";
import frost from "./frost.js";
import archiveIvory from "./archive-ivory.js";
import filigreeSilver from "./filigree-silver.js";
import concrete from "./concrete.js";
import constellation from "./constellation.js";
import walnut from "./walnut.js";
import oilSlick from "./oil-slick.js";
import { CLASSIC_STYLES } from "./classic.js";
import { ORACLE_STYLES } from "./oracle.js";

/** The 14 Sargas styles, in mockup order. */
export const SARGAS_STYLES = [
  vintageBone, obsidianGold, smokeGlass, rivetedSteel, oxbloodSeal, crackedPorcelain,
  amberMoth, frost, archiveIvory, filigreeSilver, concrete, constellation, walnut, oilSlick
].map(s => ({ collection: "sargas", ...s }));

/** Built-in styles: the Sargas collection, the Oracle finishes, then the small Classic acrylic sets. */
export const BUILTIN_STYLES = [...SARGAS_STYLES, ...ORACLE_STYLES, ...CLASSIC_STYLES];

/** Menu order and labels of the style collections. */
export const COLLECTIONS = [
  { id: "sargas", label: "SARGAS.Collection.sargas" },
  { id: "oracle", label: "SARGAS.Collection.oracle" },
  { id: "classic", label: "SARGAS.Collection.classic" }
];

export function registerBuiltinStyles() {
  for (const s of BUILTIN_STYLES) registerStyle(s);
}

export * from "./registry.js";
