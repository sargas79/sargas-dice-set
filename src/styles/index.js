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

/** Built-in styles, in mockup order. */
export const BUILTIN_STYLES = [
  vintageBone, obsidianGold, smokeGlass, rivetedSteel, oxbloodSeal, crackedPorcelain,
  amberMoth, frost, archiveIvory, filigreeSilver, concrete, constellation, walnut, oilSlick
];

export function registerBuiltinStyles() {
  for (const s of BUILTIN_STYLES) registerStyle(s);
}

export * from "./registry.js";
