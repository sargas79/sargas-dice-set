import { mottle } from "./helpers.js";

/** Image 2, bottom row 2nd: navy lacquer, white pips, etched constellation line-art. */
export default {
  id: "constellation",
  name: "Constellation",
  label: "SARGAS.Style.Constellation",
  body: {
    color: "#101f4c",
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    paint(p, rng) {
      mottle(p, rng, { scale: 0.01, amount: 0.05 });
    }
  },
  pips: { kind: "paint", color: "#f4f3ee", size: 0.16, roughness: 0.3 },
  decorateFace(p, face, rng) {
    // A small random constellation on most faces, kept inside the face.
    if (rng.next() < 0.25) return;
    const h = face.inradius * 0.85;
    const n = rng.int(4, 7);
    let x = face.cx + rng.range(-h, h) * 0.6, y = face.cy + rng.range(-h, h) * 0.6;
    const stars = [[x, y]];
    for (let i = 1; i < n; i++) {
      x = Math.max(face.cx - h, Math.min(face.cx + h, x + rng.range(-h, h) * 0.55));
      y = Math.max(face.cy - h, Math.min(face.cy + h, y + rng.range(-h, h) * 0.55));
      stars.push([x, y]);
    }
    const etch = { color: "rgba(235,238,250,0.85)", height: 0.44, rough: 0.35 };
    p.strokePath(ctx => stars.forEach(([sx, sy], i) => ctx[i ? "lineTo" : "moveTo"](sx, sy)), Math.max(1, face.unit * 0.008), etch);
    for (const [sx, sy] of stars) p.disc(sx, sy, face.unit * rng.range(0.012, 0.022), { color: "#ffffff", height: 0.44, rough: 0.3 });
  },
  physics: { mass: 1, friction: 0.32, restitution: 0.36 },
  sound: "resin"
};
