/**
 * The Spiral Set exactly as drawn in its Claude Design page (Spiral Set.html):
 * the five character sets, the atlas painting (body gradient with log-spiral
 * streaks, numbers in Cormorant SC, the character symbol on the highest face)
 * and the dragon mark cut from the design's own PNG. Keep this file a faithful
 * port of the design so the dice textures match it; how the textures are fed
 * to the 3D materials lives in spiral.js. The design's three-d-stage.js is only
 * its viewer scaffold and has no counterpart here.
 */

/** Character sets, verbatim from the design (`rough` and `dot` are the design page's own tab UI values). */
export const SPIRAL_SETS = [
  { id: "lana", name: "Lana", sym: "dragon", desc: "Electric blue · dragon",
    body: "#1454e8", body2: "#2a86ff", swirl: "#9fe4ff", ink: "#eefaff", edge: "#0a1f66", glow: "#38c8ff",
    rough: 0.22, dot: "#1f6bff" },
  { id: "anaria", name: "Anaria", sym: "crystal", desc: "Radiant purple · arcane sigil",
    body: "#6a1fc9", body2: "#b04dff", swirl: "#e3b8ff", ink: "#f6ecff", edge: "#2a0a55", glow: "#ff2238",
    rough: 0.2, dot: "#8a2be2" },
  { id: "ebdal", name: "Ebdal", sym: "axes", desc: "Fighter · sunfire · crossed axes",
    body: "#d4380f", body2: "#ff8a1c", swirl: "#ffd27a", ink: "#fff1c9", edge: "#5a1204",
    rough: 0.28, dot: "#e8531a" },
  { id: "wroan", name: "Wroan", sym: "shield", desc: "Paladin · black & white · shield",
    body: "#0e0e10", body2: "#26262a", swirl: "#f4f4f0", ink: "#f7f7f3", edge: "#000000",
    rough: 0.3, dot: "linear-gradient(90deg,#0e0e10 50%,#f4f4f0 50%)" },
  { id: "kairon", name: "Kairon", sym: "waves", desc: "Druid · tidewater · waves",
    body: "#0b6f9c", body2: "#19b3c9", swirl: "#bff4ff", ink: "#effdff", edge: "#03324a", glow: "#5fe3ff",
    rough: 0.18, dot: "#1497c0" }
];

/** The design paints its atlas in cells of this many pixels. */
export const DESIGN_CELL = 192;

/** The design's dice materials: the face material and the silver inlay on the bevels. */
export const DESIGN_MATERIAL = { roughness: 0.3, metalness: 1, bumpScale: 3, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 1.3, emissiveIntensity: 1.4 };
export const DESIGN_SILVER = { name: "silver_inlay", color: "#dfe3e8", metalness: 1, roughness: 0.22, clearcoat: 0.4, envMapIntensity: 1.4 };

/** The dragon mark image and the crop the design cuts from it (tuned to the 980px source). */
export const DRAGON_MARK = { key: "dragon", file: "assets/dragon-mark.png", source: 980, crop: [195, 195, 590, 590], size: 512, threshold: 40 };

/* ---------- dragon mark: user-supplied silhouette, luminance → alpha, tinted per set ---------- */
let dragonMask = null;
let maskFrom = null;
const tintCache = {};

/** Build (once per image) the design's alpha mask from the dragon PNG. */
export function dragonMaskFrom(dragonImg, createCanvas) {
  if (dragonMask && maskFrom === dragonImg) return dragonMask;
  const S = DRAGON_MARK.size, c = createCanvas(S, S); const x = c.getContext("2d");
  const k = dragonImg.naturalWidth / DRAGON_MARK.source; // crop tuned to the 980px source
  x.fillStyle = "#fff"; x.fillRect(0, 0, S, S);
  x.drawImage(dragonImg, 195 * k, 195 * k, 590 * k, 590 * k, 0, 0, S, S);
  const d = x.getImageData(0, 0, S, S);
  for (let i = 0; i < d.data.length; i += 4) { const a = 255 - (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a < DRAGON_MARK.threshold ? 0 : a; }
  x.putImageData(d, 0, 0);
  for (const k2 of Object.keys(tintCache)) delete tintCache[k2];
  maskFrom = dragonImg;
  return (dragonMask = c);
}

function tinted(color, createCanvas) {
  if (tintCache[color]) return tintCache[color];
  const c = createCanvas(dragonMask.width, dragonMask.height); const x = c.getContext("2d");
  x.drawImage(dragonMask, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return (tintCache[color] = c);
}

/* ---------- symbols (drawn in a unit box, radius 1) ---------- */
export function symbolPath(ctx, sym) {
  const p = new Path2D();
  if (sym === "dragon") {
    p.moveTo(-.72, .95); p.bezierCurveTo(-.86, .3, -.74, -.12, -.5, -.3);
    p.quadraticCurveTo(-.82, -.6, -1, -1); p.quadraticCurveTo(-.55, -.72, -.34, -.44);
    p.quadraticCurveTo(-.34, -.8, -.18, -1.02); p.quadraticCurveTo(-.08, -.7, -.1, -.48);
    p.lineTo(.14, -.5); p.lineTo(.28, -.68); p.lineTo(.36, -.44);
    p.quadraticCurveTo(.7, -.4, .92, -.3); p.lineTo(1, -.18); p.lineTo(.93, -.08);
    p.lineTo(.85, -.08); p.lineTo(.8, .06); p.lineTo(.73, -.06); p.lineTo(.6, -.04); p.lineTo(.55, .08); p.lineTo(.49, -.02);
    p.lineTo(.1, .06);
    p.lineTo(.42, .22); p.lineTo(.48, .1); p.lineTo(.55, .24); p.lineTo(.68, .28); p.lineTo(.73, .15); p.lineTo(.82, .32);
    p.quadraticCurveTo(.72, .46, .4, .46); p.lineTo(.12, .47); p.lineTo(.06, .66); p.lineTo(-.06, .52);
    p.bezierCurveTo(-.2, .64, -.26, .8, -.2, .95); p.closePath();
    // neck spines
    [[-.78, .55], [-.8, .2], [-.68, -.12]].forEach(([x, y]) => { p.moveTo(x, y); p.lineTo(x - .22, y - .08); p.lineTo(x + .02, y - .2); p.closePath(); });
  } else if (sym === "crystal") {
    p.moveTo(0, -1); p.quadraticCurveTo(.3, -.52, .44, -.08); p.quadraticCurveTo(.3, .42, 0, .96);
    p.quadraticCurveTo(-.3, .42, -.44, -.08); p.quadraticCurveTo(-.3, -.52, 0, -1); p.closePath();
  } else if (sym === "shield") {
    p.moveTo(-.74, -.84); p.quadraticCurveTo(0, -.66, .74, -.84); p.lineTo(.74, -.1);
    p.bezierCurveTo(.74, .46, .36, .76, 0, .98); p.bezierCurveTo(-.36, .76, -.74, .46, -.74, -.1); p.closePath();
  }
  return p;
}

function drawAxe(ctx, flip) {
  ctx.save(); ctx.scale(flip ? -1 : 1, 1);
  ctx.fillRect(-.055, -.92, .11, 1.9);
  const b = new Path2D();
  b.moveTo(.03, -.88); b.bezierCurveTo(.5, -1.02, .72, -.66, .66, -.2); b.bezierCurveTo(.5, -.34, .28, -.4, .03, -.38); b.closePath();
  ctx.fill(b);
  const s = new Path2D(); s.moveTo(-.03, -.78); s.lineTo(-.3, -.7); s.lineTo(-.03, -.5); s.closePath(); ctx.fill(s);
  ctx.restore();
}

/**
 * The character symbol at (x, y) with radius r, into the colour context and,
 * for sets with a glow, its glow version into `glowCtx`. `scale` is px per
 * design px (shadow blur is in canvas pixels, so it scales with it). The
 * dragon needs its mask (dragonMaskFrom); without one it is left out.
 */
export function drawSymbol(ctx, set, x, y, r, rot, glowCtx, { scale = 1, createCanvas } = {}) {
  const paint = (c, glow) => {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(r, r);
    c.lineJoin = "round"; c.lineCap = "round";
    if (set.sym === "dragon") {
      if (dragonMask) {
        if (!glow) { const o = .06; for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o, o], [-o, -o], [o, -o], [-o, o]]) c.drawImage(tinted(set.edge, createCanvas), -1.2 + dx, -1.2 + dy, 2.4, 2.4); }
        c.drawImage(tinted(glow ? set.glow : set.ink, createCanvas), -1.2, -1.2, 2.4, 2.4);
      }
    } else if (set.sym === "crystal") {
      // Arcane sigil: ringed triangle, three gem nodes, arrows, eye.
      const diamond = (x, y, s) => { c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * .7, y); c.lineTo(x, y + s); c.lineTo(x - s * .7, y); c.closePath(); };
      const T = [[0, -.78], [.68, .39], [-.68, .39]];
      const nodes = T.map(([x, y]) => [x * .42, y * .42 + .03]);
      const draw = (col, w) => {
        c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w;
        c.beginPath(); T.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.stroke();
        nodes.forEach(([x, y], i) => {
          const [tx, ty] = T[i];
          c.beginPath(); c.moveTo(0, .06); c.lineTo(tx * .82, ty * .82 + .02); c.stroke();
          const a = Math.atan2(ty * .82 - .04, tx * .82), hx = tx * .82, hy = ty * .82 + .02;
          c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx - Math.cos(a - .4) * .14, hy - Math.sin(a - .4) * .14); c.lineTo(hx - Math.cos(a + .4) * .14, hy - Math.sin(a + .4) * .14); c.closePath(); c.fill();
          c.beginPath(); c.arc(x, y, .17, 0, Math.PI * 2); c.stroke();
        });
        c.beginPath(); c.arc(0, .06, .08, 0, Math.PI * 2); c.fill();
      };
      if (glow) {
        c.fillStyle = set.glow;
        c.save(); c.scale(1.3, 1.3); c.translate(0, .08); nodes.forEach(([x, y]) => { diamond(x, y, .12); c.fill(); }); c.restore();
      } else {
        c.save(); c.scale(1.3, 1.3); c.translate(0, .08); draw(set.edge, .17); draw(set.ink, .085);
        c.fillStyle = set.edge; nodes.forEach(([x, y]) => { diamond(x, y, .15); c.fill(); });
        c.fillStyle = "#ff2a3f"; c.shadowColor = "#ff2238"; c.shadowBlur = 6 * scale;
        nodes.forEach(([x, y]) => { diamond(x, y, .12); c.fill(); }); c.shadowBlur = 0; c.restore();
      }
    } else if (set.sym === "axes") {
      if (glow) { c.restore(); return; }
      [[.72, false], [-.72, true]].forEach(([a, f]) => {
        c.save(); c.rotate(a);
        c.fillStyle = set.edge; c.save(); c.scale(1.08, 1.04); drawAxe(c, f); c.restore();
        c.fillStyle = set.ink; drawAxe(c, f); c.restore();
      });
    } else if (set.sym === "shield") {
      if (glow) { c.restore(); return; }
      const p = symbolPath(c, "shield");
      c.fillStyle = set.ink; c.fill(p);
      c.save(); c.scale(.8, .8); c.translate(0, -.02); c.strokeStyle = set.body; c.lineWidth = .08; c.stroke(p); c.restore();
      c.fillStyle = set.body; c.fillRect(-.09, -.55, .18, 1.18); c.fillRect(-.45, -.25, .9, .18);
    } else if (set.sym === "waves") {
      c.strokeStyle = glow ? set.glow : set.ink; c.lineWidth = .16;
      if (glow) c.lineWidth = .1;
      for (let i = 0; i < 3; i++) {
        const yy = -.5 + i * .48;
        c.beginPath(); c.moveTo(-.9, yy + .1);
        c.bezierCurveTo(-.6, yy - .28, -.3, yy + .38, 0, yy + .02);
        c.bezierCurveTo(.3, yy - .34, .6, yy + .32, .9, yy - .06);
        c.stroke();
      }
    }
    c.restore();
  };
  paint(ctx, false);
  if (glowCtx && set.glow) paint(glowCtx, true);
}

/* ---------- painting ---------- */
/** The design's own random stream (a linear congruential generator). */
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Seed of a die kind's atlas (the design's kind 100 is the d100 tens die). */
export const atlasSeed = (set, kind) => kind * 97 + set.id.length * 13;

/** Body gradient plus faint log-spiral streaks over a W×H atlas, in the design's pixel units. */
export function paintBody(ctx, W, H, set, seed) {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, set.body); g.addColorStop(.5, set.body2); g.addColorStop(1, set.body);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = rng(seed);
  ctx.lineCap = "round";
  for (let s = 0; s < Math.ceil(W * H / 20000); s++) { // faint log-spiral streaks — the "Spiral" in Spiral Set
    const cx = r() * W, cy = r() * H, a0 = r() * Math.PI * 2, dir = r() < .5 ? 1 : -1, size = 20 + r() * 70;
    ctx.strokeStyle = set.swirl; ctx.globalAlpha = set.id === "wroan" ? .16 + r() * .2 : .07 + r() * .1;
    ctx.lineWidth = .6 + r() * 2.4; ctx.beginPath();
    for (let t = 0; t < 14; t += .12) { const rad = size * Math.exp(-.18 * t), a = a0 + dir * t;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad; t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A number: Cormorant SC, outlined in the edge colour, filled with the ink; `dotted` adds the 6/9 dot. */
export function text(ctx, set, s, x, y, px, rot, dotted) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `700 ${px}px "Cormorant SC", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineJoin = "round"; ctx.strokeStyle = set.edge; ctx.lineWidth = px * .1; ctx.strokeText(s, 0, px * .04);
  ctx.fillStyle = set.ink; ctx.fillText(s, 0, px * .04);
  if (dotted) { ctx.beginPath(); ctx.arc(0, px * .52, px * .06, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/** Number size per die kind, as a fraction of the atlas cell. */
export const SIZE = { 4: .2, 6: .46, 8: .3, 10: .3, 100: .22, 12: .34, 20: .27 };

/** Symbol radius per die kind, as a fraction of the number size. */
export const SYMBOL_SIZE = kind => kind === 6 ? .55 : kind === 100 ? .7 : .6;

export function label(kind, v) {
  if (kind === 10) return String(v % 10);
  if (kind === 100) return String((v % 10) * 10).padStart(2, "0");
  return String(v);
}

/** Painted ink is where the finished atlas differs from the plain body by more than this (per-pixel RGB sum). */
export const INK_THRESHOLD = 24;
/** The ink is darkened by this much (multiply) so the engraving reads as cut into the glass. */
export const INK_DARKEN = .18;
