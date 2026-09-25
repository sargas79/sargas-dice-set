import { Painter } from "./canvas.js";
import { getLayout } from "../layout.js";
import { createRng } from "../rng.js";
import { mix } from "./patterns.js";

/** Pip positions on a d6 face, in units of half the pip grid. */
export const PIP_LAYOUT = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]]
};

/** Text shown for a face value. */
export function faceLabel(kind, value, variant) {
  if (variant === "hidden") return "?";
  if (variant === "tens") return String((value % 10) * 10).padStart(2, "0");
  if (variant === "d3") return String(((value - 1) % 3) + 1);
  if (kind === 10 && value === 10) return "0";
  return String(value);
}

const DEFAULT_FONT = `"Signika", "Palatino Linotype", "Book Antiqua", Georgia, serif`;

/**
 * Paint the texture atlas for one style + die kind.
 * @param {object} style  A registered dice style.
 * @param {object} poly   From getPolyhedron().
 * @param {number} cellPx Size of each atlas cell in pixels.
 * @param {string} [variant] "tens" (d100 tens die), "d3", "fate", "coin" or "hidden" (every face shows "?").
 */
export function paintAtlas(style, poly, cellPx, variant) {
  const layout = getLayout(poly);
  const W = layout.cols * cellPx, H = layout.rows * cellPx;
  const body = style.body;
  const p = new Painter(W, H, { color: body.color, rough: body.roughness ?? 0.5, metal: body.metalness ?? 0, alpha: body.opacity ?? 1 });
  const rng = createRng(`${style.id}:${poly.kind}:${variant ?? ""}`);
  const cells = [];
  for (let i = 0; i <= poly.faces.length; i++) {
    const [c, r] = layout.cellOrigin(i);
    cells.push({ x: c * cellPx, y: r * cellPx, w: cellPx, h: cellPx });
  }
  const ctx = { rng, cells, cellPx, poly, layout, variant };
  body.paint?.(p, rng, ctx);

  const unit = (cellPx * layout.fit) / (2 * layout.extent);
  for (const lf of layout.faces) {
    const cell = cells[lf.cell];
    const cx = cell.x + cell.w / 2, cy = cell.y + cell.h / 2;
    const toPx = (x, y) => [cx + x * unit, cy - y * unit];
    const polygon = lf.points.map(([x, y]) => toPx(x * layout.chamfer, y * layout.chamfer));
    // The whole face before chamfering; rounded d6s show all of it.
    const fullPolygon = lf.points.map(([x, y]) => toPx(x, y));
    const face = {
      kind: poly.kind,
      value: lf.value,
      label: faceLabel(poly.kind, lf.value, variant),
      index: lf.index,
      isMax: lf.value === poly.values.length,
      cell,
      cx,
      cy,
      unit,
      toPx,
      polygon,
      fullPolygon,
      /** Distance from the face centre to its nearest edge, in px. */
      inradius: inradius(polygon, cx, cy),
      path: c => {
        c.moveTo(polygon[0][0], polygon[0][1]);
        for (const [x, y] of polygon) c.lineTo(x, y);
        c.closePath();
      },
      vertexLabels: poly.kind === 4 ? lf.verts.map((vi, j) => ({ label: variant === "hidden" ? "?" : String(poly.vertexValues[vi]), px: polygon[j] })) : null,
      variant
    };
    style.decorateFace?.(p, face, rng, ctx);
    drawMarks(p, style, face, rng);
    style.overlayFace?.(p, face, rng, ctx);
  }
  style.decorateBody?.(p, cells[layout.bodyCell], rng, ctx);
  return p;
}

function inradius(polygon, cx, cy) {
  let best = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i], [x2, y2] = polygon[(i + 1) % polygon.length];
    const d = Math.abs((x2 - x1) * (y1 - cy) - (x1 - cx) * (y2 - y1)) / Math.hypot(x2 - x1, y2 - y1);
    best = Math.min(best, d);
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Pips and numerals                                                   */
/* ------------------------------------------------------------------ */

function drawMarks(p, style, face, rng) {
  if (face.value === 0) return; // coin rim
  // A style can draw its own marks; returning true skips the defaults below.
  if (style.drawMarks?.(p, face, rng)) return;
  if (face.variant === "coin") return drawCoinFace(p, style, face);
  if (face.variant === "fate") return drawFateFace(p, style, face);
  if (face.kind === 6 && face.variant !== "hidden" && !style.pips.numeralsOnD6) {
    // A d3 is a d6 showing 1-3 pips twice over.
    const count = face.variant === "d3" ? ((face.value - 1) % 3) + 1 : face.value;
    const pipFace = count === face.value ? face : { ...face, value: count };
    const half = Math.abs(face.polygon[0][0] - face.cx);
    const spacing = half * (style.pips.spacing ?? 0.55);
    const r = half * (style.pips.size ?? 0.19) * 1.12;
    PIP_LAYOUT[count].forEach(([gx, gy], i) => {
      const x = face.cx + gx * spacing, y = face.cy - gy * spacing;
      if (style.drawPip) style.drawPip(p, x, y, r, pipFace, i, rng);
      else drawPip(p, x, y, r, style.pips, rng);
    });
    return;
  }
  if (face.vertexLabels) {
    for (const { label, px } of face.vertexLabels) {
      const dx = px[0] - face.cx, dy = px[1] - face.cy;
      const x = face.cx + dx * 0.52, y = face.cy + dy * 0.52;
      const rot = Math.atan2(dx, -dy);
      drawNumeral(p, style, label, x, y, face.inradius * 0.62, rot, rng);
    }
    return;
  }
  const size = face.inradius * (face.kind === 10 ? 1.05 : face.kind === 20 ? 1.05 : 1.15);
  const yOff = face.kind === 10 ? face.inradius * 0.2 : face.kind === 20 ? face.inradius * 0.12 : 0;
  drawNumeral(p, style, face.label, face.cx, face.cy + yOff, size, 0, rng, face.kind >= 8 && (face.label === "6" || face.label === "9"));
}

/** Fate die: "+" on faces 1-2, "−" on faces 5-6, blank on 3-4. */
function drawFateFace(p, style, face) {
  const pips = style.numerals ?? style.pips;
  const surface = markSurface(pips);
  const half = Math.abs(face.polygon[0][0] - face.cx);
  const len = half * 0.9, thick = half * 0.22;
  if (face.value <= 2 || face.value >= 5) p.fillRect(face.cx - len / 2, face.cy - thick / 2, len, thick, surface);
  if (face.value <= 2) p.fillRect(face.cx - thick / 2, face.cy - len / 2, thick, len, surface);
}

/** Coin: a ring on both sides, a star on heads (1) and a crescent moon on tails (2). */
function drawCoinFace(p, style, face) {
  const pips = style.numerals ?? style.pips;
  const surface = markSurface(pips);
  const r = face.inradius;
  const { cx, cy } = face;
  p.strokePath(c => c.arc(cx, cy, r * 0.82, 0, Math.PI * 2), r * 0.06, surface);
  if (face.value === 1) {
    p.fillPath(c => {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.24 : r * 0.58;
        c[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      c.closePath();
    }, surface);
  } else {
    p.fillPath(c => {
      c.arc(cx, cy, r * 0.5, Math.PI * 0.25, Math.PI * 1.75, false);
      c.arc(cx + r * 0.2, cy, r * 0.4, Math.PI * 1.7, Math.PI * 0.3, true);
      c.closePath();
    }, surface);
  }
}

/** Surface description for pips/numerals of a given kind. */
export function markSurface(pips, x, y, r) {
  const color = pips.color;
  const rough = pips.roughness;
  switch (pips.kind) {
    case "hole":
      return {
        color: x == null ? color : Painter.radial(x, y, r, [[0, mix(color, "#000000", 0.35)], [0.8, color], [1, mix(color, "#ffffff", 0.08)]]),
        height: x == null ? 0.18 : Painter.radial(x, y, r, [[0, 0.02], [0.75, 0.15], [1, 0.45]]),
        rough: rough ?? 0.9,
        metal: 0,
        alpha: 1
      };
    case "cup":
      return {
        color: x == null ? color : Painter.radial(x, y, r, [[0, mix(color, "#000000", 0.3)], [0.55, color], [0.85, mix(color, "#ffffff", 0.35)], [1, color]]),
        height: x == null ? 0.25 : Painter.radial(x, y, r, [[0, 0.1], [0.8, 0.3], [1, 0.5]]),
        rough: rough ?? 0.22,
        metal: 1,
        alpha: 1
      };
    case "enamel":
      return {
        color: x == null ? color : Painter.radial(x - r * 0.3, y - r * 0.3, r * 1.4, [[0, mix(color, "#ffffff", 0.25)], [0.6, color], [1, mix(color, "#000000", 0.15)]]),
        height: 0.4,
        rough: rough ?? 0.25,
        metal: 0,
        alpha: 1
      };
    case "inlay":
      return { color, height: 0.48, rough: rough ?? 0.45, metal: 0, alpha: 1 };
    case "glow":
      return { color, height: 0.42, rough: rough ?? 0.3, metal: 0, alpha: 1, emissive: pips.emissive ?? color };
    case "paint":
    default:
      return { color, height: 0.4, rough: rough ?? 0.55, metal: pips.metal ? 1 : 0, alpha: 1 };
  }
}

export function drawPip(p, x, y, r, pips, rng) {
  // Rim first (slightly larger dark ring) so recessed pips read at small sizes.
  if (pips.kind === "hole" || pips.kind === "cup") {
    p.disc(x, y, r * 1.08, { height: 0.46, color: pips.rim ?? mix(pips.color, "#000000", 0.2), opacity: 0.6 });
  }
  p.disc(x, y, r, markSurface(pips, x, y, r));
  if (pips.worn) {
    // Chipped paint: flecks of the body colour inside the pip.
    for (let i = 0; i < 10; i++) {
      const a = rng.range(0, Math.PI * 2), d = Math.sqrt(rng.next()) * r * 0.95;
      p.disc(x + Math.cos(a) * d, y + Math.sin(a) * d, rng.range(0.04, 0.14) * r, { color: pips.worn, opacity: rng.range(0.5, 0.95) });
    }
  }
}

export function drawNumeral(p, style, text, x, y, size, rot, rng, underline = false) {
  const pips = style.numerals ?? style.pips;
  const font = `${pips.weight ?? "bold"} ${Math.round(size)}px ${pips.font ?? DEFAULT_FONT}`;
  // Flat (non-gradient) version of the pip surface for text.
  const surface = markSurface(pips);
  p.transform(x, y, rot, () => {
    // Fit wide labels (e.g. "20", "00") inside the face.
    const measure = p.ctx.color;
    measure.save();
    measure.font = font;
    const width = measure.measureText(text).width;
    measure.restore();
    const maxW = size * 1.35;
    const squash = width > maxW ? maxW / width : 1;
    const draw = (surf, dy = 0, stroke = 0) => p.apply(surf, ctx => {
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.scale(squash, 1);
      if (stroke) {
        ctx.lineWidth = stroke;
        ctx.strokeText(text, 0, dy);
      } else ctx.fillText(text, 0, dy);
    });
    if (pips.kind === "hole" || pips.kind === "cup" || pips.kind === "paint" || pips.kind === "enamel") {
      draw({ height: 0.46, color: pips.rim ?? mix(pips.color, "#000000", 0.25), opacity: 0.5 }, 0, size * 0.06);
    }
    draw(surface);
    if (underline) {
      p.fillRect(-size * 0.28, size * 0.42, size * 0.56, size * 0.07, surface);
    }
  });
}
