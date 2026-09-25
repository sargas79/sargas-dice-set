/** Fate die results (-1, 0, +1) -> d6 face values: two "+" (1, 2), two blank (3, 4), two "−" (5, 6). */
const FATE_FACE = { 1: 1, 0: 3, "-1": 6 };

/** Foundry marks the term type with a denomination: "d" die, "c" coin, "f" Fate die. */
function denominationOf(term) {
  return term?.constructor?.DENOMINATION ?? term?.denomination ?? "d";
}

/**
 * How a dice term is thrown: which solid, which face set, and how a result maps to a face value.
 * @returns {{kind:number, variant?:string, toValue:(r:number)=>number}|null}  null if the term isn't supported.
 */
export function physicalDie(term) {
  const faces = Number(term?.faces);
  const denom = denominationOf(term);
  if (denom === "c") return { kind: 2, variant: "coin", toValue: r => (r === 1 ? 1 : 2) };
  if (denom === "f") return { kind: 6, variant: "fate", toValue: r => FATE_FACE[r] ?? 3 };
  if (faces === 2) return { kind: 2, toValue: r => r };
  if (faces === 3) return { kind: 6, variant: "d3", toValue: r => r };
  if ([4, 6, 8, 10, 12, 20].includes(faces)) return { kind: faces, toValue: r => r };
  return null;
}

/**
 * Turn dice terms into physical dice to throw.
 * Works on Foundry DiceTerm objects or plain {faces, denomination?, results} objects.
 *
 * @param {{faces:number, results:{result:number}[]}[]} terms
 * @param {{maxDice?:number, hidden?:boolean}} [opts]  hidden: the viewer may not see results, so dice show "?".
 * @returns {{kind:number, variant?:string, value:number|null}[]}
 */
export function expandDice(terms, { maxDice = Infinity, hidden = false } = {}) {
  const out = [];
  const push = (kind, variant, value) => {
    if (hidden) out.push({ kind, variant: "hidden", value: null });
    else out.push(variant ? { kind, variant, value } : { kind, value });
  };
  for (const term of terms) {
    const faces = Number(term?.faces);
    const die = faces === 100 ? null : physicalDie(term);
    if (faces !== 100 && !die) continue;
    for (const r of term.results ?? []) {
      if (out.length >= maxDice) return out;
      const result = Number(r.result);
      if (faces === 100) {
        // A d100 is a tens die (00-90) plus a units die (0-9); 100 shows as 00 + 0.
        const tens = Math.floor((result % 100) / 10), units = result % 10;
        push(10, "tens", tens === 0 ? 10 : tens);
        if (out.length >= maxDice) return out;
        push(10, undefined, units === 0 ? 10 : units);
      } else {
        push(die.kind, die.variant, die.toValue(result));
      }
    }
  }
  return out;
}

/** All dice terms of a list of Foundry Rolls (including nested pools/parenthetical terms via Roll#dice). */
export function termsFromRolls(rolls) {
  return (rolls ?? []).flatMap(roll => roll?.dice ?? []);
}

const HTML_ENTITIES = { "&quot;": '"', "&#34;": '"', "&amp;": "&", "&#39;": "'", "&lt;": "<", "&gt;": ">" };

/**
 * Serialised rolls embedded as inline results (`[[1d20]]`) in chat message HTML.
 * Foundry stores each one in an anchor's data-roll attribute as escaped JSON.
 * @param {string} html
 * @param {{includePrivate?:boolean}} [opts]  Private inline rolls ([[/gmr ...]]) are skipped unless this is set.
 * @returns {object[]} Roll data suitable for Roll.fromData.
 */
export function inlineRollData(html, { includePrivate = false } = {}) {
  if (typeof html !== "string" || !html.includes("data-roll")) return [];
  const out = [];
  for (const tag of html.matchAll(/<a\b[^>]*\bdata-roll="([^"]+)"[^>]*>/g)) {
    const cls = /\bclass="([^"]*)"/.exec(tag[0])?.[1] ?? "";
    if (!includePrivate && /\bprivate\b/.test(cls)) continue;
    const raw = tag[1].replace(/&(quot|#34|amp|#39|lt|gt);/g, e => HTML_ENTITIES[e]);
    for (const decode of [s => s, globalThis.unescape, decodeURIComponent]) {
      if (!decode) continue;
      try {
        const data = JSON.parse(decode(raw));
        if (data && Array.isArray(data.terms)) {
          out.push(data);
          break;
        }
      } catch {
        /* try the next decoding */
      }
    }
  }
  return out;
}
