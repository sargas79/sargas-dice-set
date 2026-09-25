import { filigree, Painter } from "./helpers.js";

/** Image 2, top row 4th: antique silver with engraved baroque scrollwork, deep bored pips. */
export default {
  id: "filigree-silver",
  name: "Filigree Silver",
  label: "SARGAS.Style.FiligreeSilver",
  body: {
    color: "#c9c9c7",
    metalness: 1,
    roughness: 0.34,
    envMapIntensity: 1.8,
    normalStrength: 3.5,
    paint(p, rng, ctx) {
      for (const cell of ctx.cells) filigree(p, rng, cell, { raised: "#ececea", ground: "#9a9a98" });
    }
  },
  pips: { kind: "hole", color: "#111111", size: 0.19, rim: "#2a2a2a" },
  numerals: { kind: "hole", color: "#161616" },
  decorateFace(p, face) {
    // Clear a polished boss behind numerals so they stay readable over the scrollwork.
    if (face.kind === 6) return;
    const r = face.inradius * 0.72;
    p.disc(face.cx, face.cy, r, { color: Painter.radial(face.cx, face.cy, r, [[0, "#cfcfcd"], [1, "#a9a9a7"]]), height: 0.6, rough: 0.3 });
  },
  drawPip(p, x, y, r) {
    // Bevelled rim, then a deep bore.
    p.disc(x, y, r * 1.28, {
      color: Painter.radial(x, y, r * 1.28, [[0.7, "#f2f2f0"], [1, "#8a8a88"]]),
      height: Painter.radial(x, y, r * 1.28, [[0.75, 0.3], [1, 0.62]]),
      metal: 1,
      rough: 0.22
    });
    p.disc(x, y, r, {
      color: Painter.radial(x, y, r, [[0, "#050505"], [0.85, "#1a1a1a"], [1, "#4a4a4a"]]),
      height: Painter.radial(x, y, r, [[0, 0], [1, 0.25]]),
      metal: 0.6,
      rough: 0.7
    });
  },
  physics: { mass: 1.7, friction: 0.3, restitution: 0.26 },
  sound: "metal"
};
