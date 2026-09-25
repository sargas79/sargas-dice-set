import { mottle, speckle, perArea, halfSide, decalFace } from "./helpers.js";

/** Image 1, top-left: cream bone, worn black pips, red tax-stamp strip over one edge. */
export default {
  id: "vintage-bone",
  name: "Vintage Bone",
  label: "SARGAS.Style.VintageBone",
  body: {
    color: "#e2d6b8",
    roughness: 0.55,
    clearcoat: 0.15,
    paint(p, rng) {
      mottle(p, rng, { scale: 0.015, amount: 0.07, height: 0.04, tint: "#d6c49c" });
      speckle(p, rng, { count: perArea(p, 900), color: "#7a6a50", size: [0.4, 1.1], opacity: 0.45 });
      speckle(p, rng, { count: perArea(p, 300), color: "#fff8e8", size: [0.6, 1.6], height: 0.03, opacity: 0.4 });
    }
  },
  pips: { kind: "hole", color: "#1d1b18", size: 0.17, worn: "#9d937a" },
  numerals: { kind: "paint", color: "#1d1b18" },
  overlayFace(p, face, rng) {
    // Two faces carry the ends of the strip, so it reads as wrapping over the edge between them.
    if (!(face.kind === 6 ? face.value === 1 || face.value === 3 : face.isMax)) return;
    const h = face.kind === 6 ? halfSide(face) : face.inradius;
    const x = face.value === 3 ? face.cx - h * 1.02 : face.cx + h * 0.72;
    const w = h * 0.3;
    const y0 = face.cy - h * (face.value === 3 ? 0.2 : 0.95), y1 = face.cy + h * (face.value === 3 ? 0.95 : 0.25);
    p.fillRect(x, y0, w, y1 - y0, { color: "#b3202a", height: 0.56, rough: 0.7, metal: 0, alpha: 1 });
    // Printed text and serrated edge.
    p.transform(x + w / 2, (y0 + y1) / 2, Math.PI / 2, () => {
      p.apply({ color: "rgba(255,235,220,0.85)" }, ctx => {
        ctx.font = `bold ${Math.round(w * 0.38)}px Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("· REVENUE · 1¢ ·", 0, 0);
      });
    });
    for (let yy = y0; yy < y1; yy += w * 0.18) {
      p.disc(x, yy, w * 0.05, { color: "#e2d6b8", height: 0.5 });
      p.disc(x + w, yy, w * 0.05, { color: "#e2d6b8", height: 0.5 });
    }
    if (decalFace(face, 1)) {
      // Worn scuffs on the strip.
      for (let i = 0; i < 6; i++) p.disc(x + rng.range(0, w), rng.range(y0, y1), rng.range(1, w * 0.12), { color: "#d9b5a0", opacity: 0.35 });
    }
  },
  physics: { mass: 1, friction: 0.4, restitution: 0.32 },
  sound: "bone"
};
