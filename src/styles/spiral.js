import { DESIGN_NUMBER_FONT } from "./oracle-design.js";
import { createCanvas } from "../engine/textures/canvas.js";
import { styleImage } from "../engine/textures/face-images.js";
import {
  SPIRAL_SETS, DESIGN_CELL, DESIGN_MATERIAL, DESIGN_SILVER, DRAGON_MARK, INK_THRESHOLD, INK_DARKEN,
  SIZE, SYMBOL_SIZE, atlasSeed, dragonMaskFrom, drawSymbol, label, paintBody, text
} from "./spiral-design.js";

/**
 * "Spiral" collection: the five character sets of the Spiral Set design
 * (Lana, Anaria, Ebdal, Wroan, Kairon). Every atlas is painted by the design's
 * own code (spiral-design.js): body gradient with log-spiral streaks, numbers
 * in Cormorant SC outlined in the edge colour, the character's symbol on the
 * highest face (and at the 4 of the d4), the dragon cut from the design's PNG.
 * The design derives its bump and metalness maps from where ink was painted
 * over the body, darkens the ink slightly and lights the glow symbols through
 * an emissive map; the same steps run here on the painter's layers, and the
 * bevels get the design's silver inlay material through the body cell.
 */

/** Body-only snapshot of each atlas, taken before any marks (the design's `bodyOnly`). */
const bodyOnly = new WeakMap();

/** The design's die kind for a face (its kind 100 is the d100 tens die). */
const designKind = face => (face.variant === "tens" ? 100 : face.kind);

function spiralStyle(set) {
  const key = set.id.charAt(0).toUpperCase() + set.id.slice(1);
  const drawOpts = { createCanvas };
  return {
    id: `spiral-${set.id}`,
    name: set.name,
    label: `SARGAS.Style.Spiral${key}`,
    description: set.desc,
    collection: "spiral",
    emissive: !!set.glow,
    fonts: [DESIGN_NUMBER_FONT],
    images: set.sym === "dragon" ? [{ key: DRAGON_MARK.key, file: DRAGON_MARK.file }] : undefined,
    body: {
      color: set.body,
      roughness: DESIGN_MATERIAL.roughness,
      metalness: DESIGN_MATERIAL.metalness,
      clearcoat: DESIGN_MATERIAL.clearcoat,
      clearcoatRoughness: DESIGN_MATERIAL.clearcoatRoughness,
      envMapIntensity: DESIGN_MATERIAL.envMapIntensity,
      paint(p, rng, ctx) {
        // The design paints in 192px cells; draw its atlas scaled to ours so every quality matches it.
        const kind = ctx.variant === "tens" ? 100 : ctx.poly.kind;
        const s = ctx.cellPx / DESIGN_CELL, W = ctx.layout.cols * DESIGN_CELL, H = ctx.layout.rows * DESIGN_CELL;
        const c = p.ctx.color;
        c.save();
        c.scale(s, s);
        paintBody(c, W, H, set, atlasSeed(set, kind));
        c.restore();
        bodyOnly.set(p, c.getImageData(0, 0, p.width, p.height).data);
      }
    },
    // Coins, Fate dice and the defaults' "?" use plain ink; everything else is drawn by the design below.
    pips: { kind: "paint", color: set.ink, size: 0.19, roughness: DESIGN_MATERIAL.roughness, emissiveIntensity: DESIGN_MATERIAL.emissiveIntensity },
    numerals: { kind: "paint", color: set.ink, roughness: DESIGN_MATERIAL.roughness },
    drawMarks(p, face) {
      if (face.variant === "coin" || face.variant === "fate") return false;
      const kind = designKind(face);
      const cx = p.ctx.color, gx = set.glow ? p.ctx.emissive : null;
      const px = face.cell.w * SIZE[kind], scale = face.cell.w / DESIGN_CELL;
      const opts = { ...drawOpts, scale };
      if (set.sym === "dragon") {
        const img = styleImage(this, DRAGON_MARK.key);
        if (img) dragonMaskFrom(img, createCanvas);
      }
      const hidden = face.variant === "hidden";
      if (face.vertexLabels) {
        // d4: numbers at the corners, the symbol where the 4 would be.
        face.vertexLabels.forEach(({ label: v }, j) => {
          const [vx, vy] = face.fullPolygon[j];
          const dx = vx - face.cx, dy = vy - face.cy, rot = Math.atan2(dx, -dy);
          const x = face.cx + dx * .56, y = face.cy + dy * .56;
          if (!hidden && v === "4") drawSymbol(cx, set, x, y, px * .55, rot, gx, opts); else text(cx, set, v, x, y, px, rot);
        });
        return true;
      }
      const max = kind === 100 ? 10 : kind;
      if (!hidden && (!face.variant || face.variant === "tens") && face.value === max) {
        drawSymbol(cx, set, face.cx, face.cy, px * SYMBOL_SIZE(kind), 0, gx, opts);
        return true;
      }
      const s = hidden ? "?" : face.variant === "d3" ? face.label : label(kind, face.value);
      const dotted = (s === "6" || s === "9") && kind !== 6 && kind !== 8;
      const shift = kind === 10 || kind === 100 ? -px * .12 : 0;
      text(cx, set, s, face.cx, face.cy + shift, px, 0, dotted);
      return true;
    },
    decorateBody(p, cell, rng, ctx) {
      const { width: W, height: H } = p;
      const base = bodyOnly.get(p);
      const img = p.ctx.color.getImageData(0, 0, W, H);
      // The design's bump/metalness map: black where ink was painted, white on the body, blurred by a pixel.
      const bump = createCanvas(W, H), bx = bump.getContext("2d"), bo = bx.createImageData(W, H);
      for (let i = 0; i < img.data.length; i += 4) {
        const d = base ? Math.abs(img.data[i] - base[i]) + Math.abs(img.data[i + 1] - base[i + 1]) + Math.abs(img.data[i + 2] - base[i + 2]) : 0;
        const ink = d > INK_THRESHOLD;
        bo.data[i] = bo.data[i + 1] = bo.data[i + 2] = ink ? 0 : 255; bo.data[i + 3] = 255;
      }
      bx.putImageData(bo, 0, 0); bx.filter = `blur(${ctx.cellPx / DESIGN_CELL}px)`; bx.drawImage(bump, 0, 0);
      // Metal body, painted ink: the same map drives the metalness layer.
      p.ctx.metal.drawImage(bump, 0, 0);
      // Engraved ink: sink the height layer where the map is black.
      const hx = p.ctx.height;
      hx.save(); hx.globalCompositeOperation = "multiply"; hx.globalAlpha = 0.5; hx.drawImage(bump, 0, 0); hx.restore();
      // Darken ink slightly so the engraving reads as cut into the glass.
      const c = p.ctx.color;
      c.save(); c.globalCompositeOperation = "multiply"; c.globalAlpha = INK_DARKEN; c.fillStyle = "#000"; c.drawImage(bump, 0, 0); c.restore();
      // Bevels and corners take the design's silver inlay.
      p.fillRect(cell.x, cell.y, cell.w, cell.h, { color: DESIGN_SILVER.color, metal: DESIGN_SILVER.metalness, rough: DESIGN_SILVER.roughness, height: 0.5, emissive: "#000" });
    },
    physics: { mass: 1.2, friction: 0.32, restitution: 0.36 },
    sound: "metal"
  };
}

export const SPIRAL_STYLES = SPIRAL_SETS.map(spiralStyle);
