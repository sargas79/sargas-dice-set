/**
 * Stand-alone preview page (no Foundry needed). Used for development and for
 * the screenshot checks in tools/screenshots.mjs.
 *   demo/index.html?mode=gallery            every style as a d6 (&styles=a,b to filter, &size=px)
 *   demo/index.html?mode=kinds&style=<id>   one style on every die kind
 *   demo/index.html?mode=faces              design SVG vs painted texture for styles with face artwork
 *   demo/index.html?mode=roll&style=<id>&dice=2d6,1d20,1dF,1dc&seed=1   (&hidden=1, &fit=0, &quality=low)
 * After a roll settles, window.rollResult = {expected, shown} holds the requested and rendered values.
 */
import { DiceBox } from "./engine/dice-box.js";
import { renderDie } from "./engine/thumbnail.js";
import { registerBuiltinStyles, getStyles, getStyle } from "./styles/index.js";
import { expandDice } from "./foundry/roll-parser.js";
import { preloadStyles } from "./engine/textures/face-images.js";

registerBuiltinStyles();
// Styles with SVG face artwork (Oracle) load it before anything is drawn.
await preloadStyles(getStyles());
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
  const only = params.get("styles")?.split(",");
  for (const s of getStyles()) if (!only || only.includes(s.id)) tile(renderDie(s, { size, quality: "high" }), s.name);
} else if (mode === "kinds") {
  const style = getStyle(params.get("style")) ?? getStyles()[0];
  const rotation = [0.35, -0.5, 0.1];
  for (const kind of [4, 6, 8, 10, 12, 20]) tile(renderDie(style, { kind, size: 220, quality: "high", rotation }), `${style.name} d${kind}`);
  tile(renderDie(style, { kind: 10, size: 220, quality: "high", variant: "tens", rotation }), `${style.name} d100 tens`);
  tile(renderDie(style, { kind: 6, size: 220, quality: "high", variant: "fate", rotation }), `${style.name} dF`);
  tile(renderDie(style, { kind: 6, size: 220, quality: "high", variant: "d3", rotation }), `${style.name} d3`);
  tile(renderDie(style, { kind: 2, size: 220, quality: "high", variant: "coin", rotation: [0.9, 0, 0.1] }), `${style.name} coin`);
  tile(renderDie(style, { kind: 20, size: 220, quality: "high", variant: "hidden", rotation }), `${style.name} hidden`);
} else if (mode === "faces") {
  // Face artwork check: the design's SVG next to the d6 colour texture the engine paints.
  const { getPolyhedron } = await import("./engine/polyhedra.js");
  const { getLayout } = await import("./engine/layout.js");
  const { paintAtlas } = await import("./engine/textures/faces.js");
  const { faceImage } = await import("./engine/textures/face-images.js");
  const poly = getPolyhedron(6), layout = getLayout(poly), cellPx = 256;
  const report = [];
  for (const style of getStyles().filter(s => s.faceSvg)) {
    const atlas = paintAtlas(style, poly, cellPx).canvases.color;
    for (const lf of layout.faces) {
      const [c, r] = layout.cellOrigin(lf.cell);
      const half = (cellPx * layout.fit) / 2; // the full face square spans the cell's fitted area
      const x = c * cellPx + cellPx / 2 - half, y = r * cellPx + cellPx / 2 - half;
      const size = Math.round(half * 2);
      const mine = document.createElement("canvas");
      mine.width = mine.height = size;
      mine.getContext("2d").drawImage(atlas, x, y, half * 2, half * 2, 0, 0, size, size);
      const ref = document.createElement("canvas");
      ref.width = ref.height = size;
      ref.getContext("2d").drawImage(faceImage(style, lf.value), 0, 0, size, size);
      // Compare only where the design face is opaque (its rounded corners are transparent).
      const a = mine.getContext("2d").getImageData(0, 0, size, size).data;
      const b = ref.getContext("2d").getImageData(0, 0, size, size).data;
      let sum = 0, n = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (b[i + 3] < 255) continue;
        sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        n += 3;
      }
      report.push({ style: style.id, value: lf.value, meanDiff: +(sum / n).toFixed(3) });
      tile(ref, `${style.name} ${lf.value} · design`);
      tile(mine, `${style.name} ${lf.value} · texture`);
    }
  }
  window.facesReport = report;
} else if (mode === "roll") {
  const box = new DiceBox({
    settings: () => ({
      quality: params.get("quality") ?? "high",
      volume: 0,
      fadeDelay: 1e9,
      speed: Number(params.get("speed") ?? 1),
      envRotation: params.get("env")?.split(",").map(Number),
      fitScreen: params.get("fit") !== "0"
    })
  });
  const style = getStyle(params.get("style")) ?? getStyles()[0];
  // dice=2d6,1d20,1dF,1dc,1d3,1d100 — results are picked deterministically from the seed and die index.
  const k = Number(params.get("seed") ?? 1) * 7;
  const terms = (params.get("dice") ?? "2d6").split(",").map(t => {
    const [count, type] = t.split("d");
    const n = Number(count) || 1;
    if (type === "F") return { denomination: "f", faces: 3, results: Array.from({ length: n }, (_, i) => ({ result: ((i + k) % 3) - 1 })) };
    if (type === "c") return { denomination: "c", faces: 2, results: Array.from({ length: n }, (_, i) => ({ result: (i + k) % 2 })) };
    const f = Number(type);
    return { faces: f, results: Array.from({ length: n }, (_, i) => ({ result: 1 + ((i * 3 + k + f) % f) })) };
  });
  const dice = expandDice(terms, { hidden: params.get("hidden") === "1" }).map(d => ({ ...d, style }));
  window.rollResult = { expected: dice.map(d => d.value) };
  const { settled } = box.roll({ dice, seed: params.get("seed") ?? 1 });
  settled.then(() => {
    window.rollResult.shown = box.shownValues()[0] ?? [];
    window.rollSettled = true;
  });
  window.box = box;
  // Throw the same dice again (used by the smoke test after simulating a GPU context loss).
  window.throwAgain = async seed => {
    await box.roll({ dice, seed }).settled;
    const shown = box.shownValues().at(-1) ?? [];
    return { expected: dice.map(d => d.value), shown };
  };
}
window.ready = true;
