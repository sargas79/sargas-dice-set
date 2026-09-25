import { mottle, speckle, scratches, perArea, halfSide, decalFace } from "./helpers.js";

function catalogueLabel(p, face, rng) {
  const h = face.kind === 6 ? halfSide(face) : face.inradius;
  const x0 = face.cx - h * 0.98, x1 = face.cx + h * 0.2;
  const y0 = face.cy - h * 0.7, y1 = face.cy + h * 0.95;
  const paper = { color: "#d7c59c", height: 0.53, rough: 0.85, metal: 0, alpha: 1 };
  p.fillRect(x0, y0, x1 - x0, y1 - y0, paper);
  // Foxing stains.
  for (let i = 0; i < 10; i++) p.disc(rng.range(x0, x1), rng.range(y0, y1), rng.range(1, h * 0.12), { color: "#b99f6c", opacity: 0.35 });
  const ink = { color: "#3b3026" };
  p.strokePath(ctx => ctx.rect(x0 + h * 0.06, y0 + h * 0.06, x1 - x0 - h * 0.12, y1 - y0 - h * 0.12), Math.max(1, h * 0.02), ink);
  // Printed index numbers down the margin.
  p.apply(ink, ctx => {
    ctx.font = `${Math.round(h * 0.13)}px Georgia, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ["8", "9", "·", "3"].forEach((t, i) => ctx.fillText(t, x0 + h * 0.1, y0 + h * (0.3 + i * 0.25)));
  });
  // Ruled box with the handwritten number.
  const bx = x0 + h * 0.3, by = face.cy - h * 0.05, bw = (x1 - x0) * 0.62, bh = h * 0.45;
  p.strokePath(ctx => ctx.rect(bx, by - bh / 2, bw, bh), Math.max(1, h * 0.015), ink);
  p.apply({ color: "#2c241c" }, ctx => {
    ctx.font = `italic ${Math.round(h * 0.34)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("36", bx + bw / 2, by + h * 0.02);
  });
}

/** Image 2, top row 3rd: aged ivory, sage-green pips, a paper catalogue label reading "36". */
export default {
  id: "archive-ivory",
  name: "Archive Ivory",
  label: "SARGAS.Style.ArchiveIvory",
  body: {
    color: "#e4d8bd",
    roughness: 0.6,
    paint(p, rng) {
      mottle(p, rng, { scale: 0.012, amount: 0.1, height: 0.04, tint: "#d8c49a" });
      speckle(p, rng, { count: perArea(p, 500), color: "#8d7a5a", size: [0.4, 1], opacity: 0.35 });
      scratches(p, rng, { count: perArea(p, 25), color: "#c9b893", length: [6, 22], width: 0.8, opacity: 0.5 });
    }
  },
  pips: { kind: "paint", color: "#6e9c7a", size: 0.15, roughness: 0.6 },
  decorateFace(p, face, rng) {
    if (decalFace(face, 4)) catalogueLabel(p, face, rng);
  },
  physics: { mass: 1, friction: 0.4, restitution: 0.32 },
  sound: "bone"
};
