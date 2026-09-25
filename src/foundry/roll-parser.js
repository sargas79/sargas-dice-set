import { SUPPORTED_FACES } from "../constants.js";

/**
 * Turn dice terms into physical dice to throw.
 * Works on Foundry DiceTerm objects or plain {faces, results} objects.
 *
 * @param {{faces:number, results:{result:number, hidden?:boolean}[]}[]} terms
 * @param {{maxDice?:number, hidden?:boolean}} [opts]  hidden: throw without showing real results.
 * @returns {{kind:number, variant?:string, value:number|null}[]}
 */
export function expandDice(terms, { maxDice = Infinity, hidden = false } = {}) {
  const out = [];
  for (const term of terms) {
    const faces = Number(term?.faces);
    if (!SUPPORTED_FACES.includes(faces)) continue;
    for (const r of term.results ?? []) {
      if (out.length >= maxDice) return out;
      const value = hidden ? null : Number(r.result);
      if (faces === 100) {
        const tens = value == null ? null : Math.floor((value % 100) / 10);
        const units = value == null ? null : value % 10;
        out.push({ kind: 10, variant: "tens", value: tens == null ? null : tens === 0 ? 10 : tens });
        if (out.length >= maxDice) return out;
        out.push({ kind: 10, value: units == null ? null : units === 0 ? 10 : units });
      } else {
        out.push({ kind: faces, value });
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
