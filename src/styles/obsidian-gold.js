import { mottle, halfSide, insetPath } from "./helpers.js";
import { drawPip } from "../engine/textures/faces.js";

const GOLD = { color: "#caa54e", metal: 1, rough: 0.28, height: 0.62, alpha: 1 };
const GLYPHS = ["triangle", "diamond", "eye", "hex", "chevron", "circle"];

function glyph(p, kind, x, y, r) {
  const s = r * 0.55;
  const w = r * 0.13;
  p.strokePath(ctx => ctx.arc(x, y, r, 0, Math.PI * 2), w, GOLD);
  const path = {
    triangle: ctx => {
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.9, y + s * 0.6);
      ctx.lineTo(x - s * 0.9, y + s * 0.6);
      ctx.closePath();
    },
    diamond: ctx => {
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.7, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s * 0.7, y);
      ctx.closePath();
    },
    eye: ctx => {
      ctx.ellipse(x, y, s, s * 0.5, 0, 0, Math.PI * 2);
      ctx.moveTo(x + s * 0.22, y);
      ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
    },
    hex: ctx => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * s * 0.8, y + Math.sin(a) * s * 0.8);
      }
      ctx.closePath();
    },
    chevron: ctx => {
      ctx.moveTo(x - s * 0.8, y - s * 0.3);
      ctx.lineTo(x, y + s * 0.5);
      ctx.lineTo(x + s * 0.8, y - s * 0.3);
    },
    circle: ctx => {
      ctx.arc(x, y, s * 0.55, 0, Math.PI * 2);
    }
  }[kind];
  p.strokePath(path, w * 0.85, GOLD);
}

/** Image 1, top-centre: glossy black, gold inset border, gold cups and engraved rune glyphs. */
export default {
  id: "obsidian-gold",
  name: "Obsidian & Gold",
  label: "SARGAS.Style.ObsidianGold",
  body: {
    color: "#0c0c0e",
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    paint(p, rng) {
      mottle(p, rng, { scale: 0.01, amount: 0.05, height: 0.01 });
    }
  },
  pips: { kind: "cup", color: "#c9a44c", size: 0.16 },
  numerals: { kind: "paint", color: "#caa54e", metal: true, roughness: 0.28 },
  decorateFace(p, face) {
    p.strokePath(insetPath(face, 0.86), Math.max(1.5, face.unit * 0.028), GOLD);
  },
  drawPip(p, x, y, r, face, i) {
    // Faces 2, 5 and 6 use engraved glyphs; the rest use polished gold cups (as in the mockup).
    if ([2, 5, 6].includes(face.value)) glyph(p, GLYPHS[(i + face.value) % GLYPHS.length], x, y, r * 1.05);
    else drawPip(p, x, y, r, this.pips);
  },
  physics: { mass: 1.1, friction: 0.3, restitution: 0.38 },
  sound: "ceramic"
};
