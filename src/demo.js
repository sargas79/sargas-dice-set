/**
 * Stand-alone preview page (no Foundry needed). Used for development and for
 * the screenshot checks in tools/screenshots.mjs.
 *   demo/index.html?mode=gallery            every style as a d6
 *   demo/index.html?mode=kinds&style=<id>   one style on every die kind
 *   demo/index.html?mode=roll&style=<id>&dice=2d6,1d20&seed=1
 */
import { DiceBox } from "./engine/dice-box.js";
import { renderDie } from "./engine/thumbnail.js";
import { registerBuiltinStyles, getStyles, getStyle } from "./styles/index.js";
import { expandDice } from "./foundry/roll-parser.js";

registerBuiltinStyles();
const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "gallery";
const root = document.getElementById("root");

function tile(canvas, caption) {
  const fig = document.createElement("figure");
  const img = new Image();
  img.src = canvas.toDataURL();
  fig.append(img);
  const cap = document.createElement("figcaption");
  cap.textContent = caption;
  fig.append(cap);
  root.append(fig);
  return img;
}

if (mode === "gallery") {
  const size = Number(params.get("size") ?? 256);
  for (const s of getStyles()) tile(renderDie(s, { size, quality: "high" }), s.name);
} else if (mode === "kinds") {
  const style = getStyle(params.get("style")) ?? getStyles()[0];
  for (const kind of [4, 6, 8, 10, 12, 20]) tile(renderDie(style, { kind, size: 220, quality: "high", rotation: [0.35, -0.5, 0.1] }), `${style.name} d${kind}`);
  tile(renderDie(style, { kind: 10, size: 220, quality: "high", variant: "tens", rotation: [0.35, -0.5, 0.1] }), `${style.name} d100 tens`);
} else if (mode === "roll") {
  const box = new DiceBox({ settings: () => ({ quality: params.get("quality") ?? "high", volume: 0, fadeDelay: 1e9, speed: Number(params.get("speed") ?? 1) }) });
  const style = getStyle(params.get("style")) ?? getStyles()[0];
  const terms = (params.get("dice") ?? "2d6").split(",").map(t => {
    const [n, f] = t.split("d").map(Number);
    return { faces: f, results: Array.from({ length: n || 1 }, (_, i) => ({ result: 1 + ((i * 3 + f) % f) })) };
  });
  const dice = expandDice(terms).map(d => ({ ...d, style }));
  window.rollResult = { expected: dice.map(d => d.value) };
  const { settled } = box.roll({ dice, seed: params.get("seed") ?? 1 });
  settled.then(() => (window.rollSettled = true));
  window.box = box;
}
window.ready = true;
