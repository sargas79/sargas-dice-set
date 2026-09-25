import { mottle, woodGrain, Painter, halfSide, decalFace } from "./helpers.js";
import { drawPip } from "../engine/textures/faces.js";

function waxSeal(p, x, y, r, rng) {
  // Irregular blob of wax.
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = r * (1 + rng.range(-0.08, 0.1));
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  const blob = ctx => {
    pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](px, py));
    ctx.closePath();
  };
  p.fillPath(blob, {
    color: Painter.radial(x - r * 0.3, y - r * 0.3, r * 1.4, [[0, "#c42a2f"], [0.7, "#8e1218"], [1, "#5e0a0e"]]),
    height: Painter.radial(x, y, r, [[0, 0.85], [0.8, 0.8], [1, 0.55]]),
    rough: 0.42,
    metal: 0,
    alpha: 1
  });
  // Stamped crest: a ring, a shield and a small crown.
  const inner = r * 0.62;
  p.strokePath(ctx => ctx.arc(x, y, inner, 0, Math.PI * 2), r * 0.07, { color: "#6d0c11", height: 0.62 });
  p.fillPath(ctx => {
    ctx.moveTo(x - inner * 0.45, y - inner * 0.35);
    ctx.lineTo(x + inner * 0.45, y - inner * 0.35);
    ctx.lineTo(x + inner * 0.45, y + inner * 0.05);
    ctx.quadraticCurveTo(x + inner * 0.4, y + inner * 0.45, x, y + inner * 0.6);
    ctx.quadraticCurveTo(x - inner * 0.4, y + inner * 0.45, x - inner * 0.45, y + inner * 0.05);
    ctx.closePath();
  }, { color: "#761016", height: 0.66 });
  p.fillPath(ctx => {
    const cy = y - inner * 0.55;
    ctx.moveTo(x - inner * 0.3, cy + inner * 0.12);
    ctx.lineTo(x - inner * 0.3, cy - inner * 0.08);
    ctx.lineTo(x - inner * 0.15, cy + inner * 0.02);
    ctx.lineTo(x, cy - inner * 0.12);
    ctx.lineTo(x + inner * 0.15, cy + inner * 0.02);
    ctx.lineTo(x + inner * 0.3, cy - inner * 0.08);
    ctx.lineTo(x + inner * 0.3, cy + inner * 0.12);
    ctx.closePath();
  }, { color: "#761016", height: 0.66 });
}

/** Image 1, bottom-centre: oxblood lacquer, brass cup pips, a wax seal pressed into one face. */
export default {
  id: "oxblood-seal",
  name: "Oxblood & Wax Seal",
  label: "SARGAS.Style.OxbloodSeal",
  body: {
    color: "#5a0f14",
    roughness: 0.34,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    paint(p, rng, ctx) {
      woodGrain(p, rng, { light: "#5e1016", dark: "#4a0b10", frequency: 0.07, warp: 5, cells: ctx.cells });
      mottle(p, rng, { scale: 0.01, amount: 0.1 });
    }
  },
  pips: { kind: "cup", color: "#b8934a", size: 0.17 },
  numerals: { kind: "paint", color: "#c09a50", metal: true, roughness: 0.25 },
  decorateFace(p, face, rng) {
    if (face.kind !== 6 && face.isMax) waxSeal(p, face.cx, face.cy, face.inradius * 0.85, rng);
  },
  drawPip(p, x, y, r, face, i, rng) {
    // The single pip of the 1 face is the wax seal.
    if (face.value === 1) waxSeal(p, x, y, halfSide(face) * 0.42, rng);
    else drawPip(p, x, y, r, this.pips);
  },
  physics: { mass: 1, friction: 0.38, restitution: 0.3 },
  sound: "wood"
};
