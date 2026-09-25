import { mottle, insetPath } from "./helpers.js";

/**
 * "Oracle" collection: six finishes ported from the Archive Dice design
 * (Brass Ward, Midnight Ledger, Specimen Resin, Containment Steel, Archivist,
 * Sigil). d6 faces are drawn from the design's 100×100 vector face: body
 * gradient, glow, panel, engraved pattern, frame and gem-like pips, using its
 * exact colours and paths. Other dice kinds reuse the finish's body, border
 * and pip colours with numerals.
 */

/** Stepped art-deco corner marks (Archivist). */
function decoCorners(o, s) {
  const a = o, b = 100 - o;
  return `M${a} ${a + s * 2} H${a + s} V${a + s} H${a + s * 2} V${a}` +
    ` M${b} ${a + s * 2} H${b - s} V${a + s} H${b - s * 2} V${a}` +
    ` M${a} ${b - s * 2} H${a + s} V${b - s} H${a + s * 2} V${b}` +
    ` M${b} ${b - s * 2} H${b - s} V${b - s} H${b - s * 2} V${b}`;
}

function circlePath(r) {
  return `M50 ${50 - r} A${r} ${r} 0 1 0 50 ${50 + r} A${r} ${r} 0 1 0 50 ${50 - r} Z`;
}

function wardTicks() {
  let d = "";
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    const r1 = i % 2 ? 37.5 : 36, r2 = 40;
    d += ` M${(50 + Math.cos(t) * r1).toFixed(2)} ${(50 + Math.sin(t) * r1).toFixed(2)} L${(50 + Math.cos(t) * r2).toFixed(2)} ${(50 + Math.sin(t) * r2).toFixed(2)}`;
  }
  return d;
}

const BASE = {
  radius: 12, frame1: "#000", frame2: "#000", frame3: "#000", frameWidth: 0, frameInset: 0,
  glow: null, glowOpacity: 0, swirl: null, swirlOpacity: 0,
  panelInset: 0, panelRx: 0, panelFill: null, panelStroke: null, panelWidth: 0,
  pattern: null, patternColor: null, patternWidth: 0, pipR: 7, pipShine: 0.4
};

/** Face artwork, straight from the design (100×100 units, y down). */
const FACES = {
  brass: { ...BASE, body1: "#1d2020", body2: "#040505", radius: 13,
    frame1: "#6b4f1f", frame2: "#e8cb82", frame3: "#5a4118", frameWidth: 7, frameInset: 3.5,
    rim: "#c9a55a", pip1: "#3fe3ad", pip2: "#08463a", pipR: 6.6, pipShine: 0.55 },
  ledger: { ...BASE, body1: "#223254", body2: "#0f1829",
    frame1: "#0a111f", frame2: "#2b3c5e", frame3: "#0a111f", frameWidth: 2, frameInset: 1,
    panelInset: 7, panelRx: 6, panelStroke: "#475c86", panelWidth: 0.8,
    pattern: "M50 13 L87 50 L50 87 L13 50 Z M50 19 L81 50 L50 81 L19 50 Z M7 7 L17 17 M93 7 L83 17 M7 93 L17 83 M93 93 L83 83",
    patternColor: "#475c86", patternWidth: 0.8,
    rim: "#3a2f14", pip1: "#f0d488", pip2: "#8a6a2c", pipR: 6.2, pipShine: 0.25 },
  resin: { ...BASE, body1: "#2c3431", body2: "#070a09", radius: 20,
    glow: "#1fbf88", glowOpacity: 0.7,
    swirl: "M20 72 C30 38 66 82 80 34 M28 28 C44 50 58 26 74 62", swirlOpacity: 0.55,
    rim: "#5b4518", pip1: "#f2d17e", pip2: "#8d6b2d", pipR: 7.4, pipShine: 0.45 },
  steel: { ...BASE, body1: "#5a6066", body2: "#1b1e21",
    frame1: "#9aa1a7", frame2: "#3a3f44", frame3: "#15181a", frameWidth: 2, frameInset: 1,
    panelInset: 12, panelRx: 8, panelFill: "#2a2e32", panelStroke: "#0c0e10", panelWidth: 2.4,
    pattern: "M5 6.5 A1.5 1.5 0 1 0 8 6.5 A1.5 1.5 0 1 0 5 6.5 Z M92 6.5 A1.5 1.5 0 1 0 95 6.5 A1.5 1.5 0 1 0 92 6.5 Z M5 93.5 A1.5 1.5 0 1 0 8 93.5 A1.5 1.5 0 1 0 5 93.5 Z M92 93.5 A1.5 1.5 0 1 0 95 93.5 A1.5 1.5 0 1 0 92 93.5 Z",
    patternColor: "#0c0e10", patternWidth: 1,
    rim: "#07090a", pip1: "#39e0bc", pip2: "#05372d", pipR: 6.8, pipShine: 0.35 },
  archivist: { ...BASE, body1: "#2a2b2a", body2: "#121313",
    pattern: `M8 8 H92 V92 H8 Z M12 12 H88 V88 H12 Z ${decoCorners(12, 4.5)} M8 8 L12 12 M92 8 L88 12 M8 92 L12 88 M92 92 L88 88`,
    patternColor: "#c9a24f", patternWidth: 0.9,
    rim: "#8f8468", pip1: "#f4ecd6", pip2: "#b9ab8b", pipR: 7, pipShine: 0.2 },
  sigil: { ...BASE, body1: "#17181b", body2: "#030304",
    pattern: `${circlePath(40)} ${circlePath(35)} ${circlePath(11)} M50 15 L85 50 L50 85 L15 50 Z M25.25 25.25 L74.75 25.25 L74.75 74.75 L25.25 74.75 Z M50 15 L80.3 67.5 L19.7 67.5 Z${wardTicks()}`,
    patternColor: "#caa75a", patternWidth: 0.75,
    rim: "#caa75a", pip1: "#5ff0df", pip2: "#07615a", pipR: 5.8, pipShine: 0.6 }
};

/** Pip positions from the design (face units). */
const A = 28, B = 72, C = 50;
const LAYOUT = {
  1: [[C, C]],
  2: [[A, A], [B, B]],
  3: [[A, A], [C, C], [B, B]],
  4: [[A, A], [B, A], [A, B], [B, B]],
  5: [[A, A], [B, A], [C, C], [A, B], [B, B]],
  6: [[A, 26], [B, 26], [A, C], [B, C], [A, 74], [B, 74]]
};

/**
 * How each finish behaves as a physical material. `gilt` marks metallic
 * engraving, `gem` marks glowing inlaid pips, `metalPips` marks brass pips.
 */
const FINISHES = [
  { key: "brass", name: "Brass Ward", label: "BrassWard", sound: "ceramic",
    body: { roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 }, gem: true, frameMetal: true },
  { key: "ledger", name: "Midnight Ledger", label: "MidnightLedger", sound: "resin",
    body: { roughness: 0.72 }, metalPips: true },
  { key: "resin", name: "Specimen Resin", label: "SpecimenResin", sound: "resin",
    body: { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, opacity: 0.84, ior: 1.52 }, metalPips: true, bloom: true },
  { key: "steel", name: "Containment Steel", label: "ContainmentSteel", sound: "metal",
    body: { roughness: 0.42, metalness: 0.75, envMapIntensity: 1.4 }, gem: true, frameMetal: true, physics: { mass: 1.6, friction: 0.3, restitution: 0.26 } },
  { key: "archivist", name: "Archivist", label: "Archivist", sound: "stone",
    body: { roughness: 0.78 }, gilt: true },
  { key: "sigil", name: "Sigil", label: "Sigil", sound: "ceramic",
    body: { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }, gilt: true, gem: true }
];

/* ------------------------------------------------------------------ */
/* Drawing                                                            */
/* ------------------------------------------------------------------ */

/** Draw on every layer in the face's 100×100 design space (y down), clipped to nothing. */
function inDesign(p, face, surface, draw) {
  const half = Math.abs(face.fullPolygon[0][0] - face.cx);
  const x0 = face.cx - half, y0 = face.cy - half, s = (half * 2) / 100;
  p.apply(surface, (ctx, layer) => {
    ctx.translate(x0, y0);
    ctx.scale(s, s);
    draw(ctx, layer, s);
  });
}

/** Surface values as design-space gradients (built after the transform, so coordinates are face units). */
const linear = (x1, y1, x2, y2, stops) => ctx => {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
};
const radial = (cx, cy, r, stops, fx = cx, fy = cy) => ctx => {
  const g = ctx.createRadialGradient(fx, fy, 0, cx, cy, r);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
};
const gray = v => `rgb(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)})`;
const withAlpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** The full design face: body, glow, panel, pattern, frame. Pips are drawn separately. */
function drawFaceArt(p, face, f, fin) {
  // Body: diagonal gradient over the whole cell square so rounded corners match.
  inDesign(p, face, { color: linear(0, 0, 100, 100, [[0, f.body1], [1, f.body2]]) }, ctx => ctx.fillRect(-8, -8, 116, 116));

  if (f.glow) {
    // Suspended bloom: a soft green glow that also lights the emissive layer.
    const glow = radial(50, 55, 44, [[0, withAlpha(f.glow, 0.95)], [0.6, withAlpha(f.glow, 0.35)], [1, withAlpha(f.glow, 0)]]);
    inDesign(p, face, { color: glow, emissive: glow, opacity: f.glowOpacity }, ctx => {
      ctx.beginPath();
      ctx.ellipse(50, 55, 44, 42, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    inDesign(p, face, { color: f.glow, emissive: f.glow, opacity: f.swirlOpacity }, (ctx, layer, s) => {
      ctx.filter = `blur(${(3.2 * s).toFixed(1)}px)`;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.stroke(new Path2D(f.swirl));
    });
  }

  if (f.panelInset) {
    const x = f.panelInset, w = 100 - f.panelInset * 2;
    if (f.panelFill) {
      // Sunken inner panel.
      inDesign(p, face, { color: f.panelFill, height: 0.38 }, ctx => {
        roundRect(ctx, x, x, w, w, f.panelRx);
        ctx.fill();
      });
    }
    inDesign(p, face, { color: f.panelStroke, height: 0.42 }, ctx => {
      ctx.lineWidth = f.panelWidth;
      roundRect(ctx, x, x, w, w, f.panelRx);
      ctx.stroke();
    });
  }

  if (f.pattern) {
    // Engraved linework; gilt finishes inlay it in metal.
    const surf = fin.gilt ? { color: f.patternColor, metal: 1, rough: 0.3, height: 0.56 } : { color: f.patternColor, height: 0.42 };
    inDesign(p, face, surf, ctx => {
      ctx.lineWidth = f.patternWidth * (fin.gilt ? 1.4 : 1.2);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke(new Path2D(f.pattern));
    });
  }

  if (f.frameWidth) {
    const x = f.frameInset, w = 100 - f.frameInset * 2, r = Math.max(0, f.radius - f.frameInset);
    const surf = {
      color: linear(0, 0, 100, 100, [[0, f.frame1], [0.45, f.frame2], [1, f.frame3]]),
      height: linear(0, 0, 100, 100, [[0, gray(0.66)], [0.45, gray(0.72)], [1, gray(0.6)]]),
      ...(fin.frameMetal ? { metal: 1, rough: 0.26 } : {})
    };
    inDesign(p, face, surf, ctx => {
      ctx.lineWidth = f.frameWidth;
      roundRect(ctx, x, x, w, w, r);
      ctx.stroke();
    });
  }
}

/** One pip: dark rim ring, domed gradient centre and a small highlight. */
function drawPip(p, face, f, fin, x, y) {
  const r = f.pipR;
  inDesign(p, face, { color: f.rim, height: 0.34, ...(fin.gilt || fin.frameMetal ? { metal: 1, rough: 0.3 } : {}) }, ctx => {
    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  const fx = x - r + 0.76 * r, fy = y - r + 0.68 * r;
  const surf = {
    color: radial(fx, fy, r * 1.5, [[0, f.pip1], [1, f.pip2]]),
    height: radial(x, y, r, [[0, gray(0.62)], [1, gray(0.44)]]),
    rough: fin.metalPips ? 0.24 : 0.2,
    metal: fin.metalPips ? 1 : 0,
    alpha: 1,
    ...(fin.gem ? { emissive: radial(fx, fy, r * 1.4, [[0, withAlpha(f.pip1, 0.75)], [1, withAlpha(f.pip2, 0.4)]]) } : {})
  };
  inDesign(p, face, surf, ctx => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  inDesign(p, face, { color: "#ffffff", opacity: f.pipShine * 0.6 }, ctx => {
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Border and glow for non-d6 faces, echoing the finish. */
function decorateOtherFace(p, face, f, fin) {
  if (f.glow) {
    const r = face.inradius * 1.1;
    const g = ctx => {
      const grad = ctx.createRadialGradient(face.cx, face.cy, 0, face.cx, face.cy, r);
      grad.addColorStop(0, withAlpha(f.glow, 0.8));
      grad.addColorStop(1, withAlpha(f.glow, 0));
      return grad;
    };
    p.disc(face.cx, face.cy, r, { color: g, emissive: g, opacity: f.glowOpacity });
  }
  if (f.panelFill) p.fillPath(insetPath(face, 0.78), { color: f.panelFill, height: 0.38 });
  const border = fin.gilt ? f.patternColor : f.frameWidth > 3 ? f.frame2 : f.panelStroke ?? f.patternColor;
  if (border) {
    p.strokePath(insetPath(face, 0.86), Math.max(1.5, face.unit * (f.frameWidth > 3 ? 0.05 : 0.022)), {
      color: border,
      height: 0.58,
      ...(fin.gilt || fin.frameMetal ? { metal: 1, rough: 0.28 } : {})
    });
  }
}

function oracleStyle(fin) {
  const f = FACES[fin.key];
  return {
    id: `oracle-${fin.key}`,
    name: fin.name,
    label: `SARGAS.Style.Oracle${fin.label}`,
    collection: "oracle",
    shape: "rounded",
    roundness: +(f.radius / 50).toFixed(2),
    emissive: !!(fin.gem || f.glow),
    body: {
      color: f.body2,
      ...fin.body,
      paint(p, rng) {
        // Edges and non-face areas: the darker body colour with a faint mottle.
        p.fillRect(0, 0, p.width, p.height, { color: f.body2 });
        mottle(p, rng, { scale: 0.01, amount: 0.05, tint: f.body1 });
      }
    },
    pips: { kind: fin.metalPips ? "cup" : fin.gem ? "glow" : "paint", color: f.pip1, emissive: fin.gem ? f.pip2 : undefined, emissiveIntensity: 0.9 },
    numerals: { kind: fin.metalPips ? "paint" : fin.gem ? "glow" : "paint", color: f.pip1, metal: fin.metalPips, emissive: fin.gem ? f.pip2 : undefined, roughness: 0.3 },
    decorateFace(p, face) {
      if (face.kind === 6 && face.variant !== "hidden") drawFaceArt(p, face, f, fin);
      else decorateOtherFace(p, face, f, fin);
    },
    drawMarks(p, face) {
      // d6 (and d3, which reuses the d6) pips follow the design's layout; everything else uses numerals.
      if (face.kind !== 6 || (face.variant && face.variant !== "d3")) return false;
      const count = face.variant === "d3" ? ((face.value - 1) % 3) + 1 : face.value;
      for (const [x, y] of LAYOUT[count]) drawPip(p, face, f, fin, x, y);
      return true;
    },
    physics: fin.physics ?? { mass: 1, friction: 0.33, restitution: 0.35 },
    sound: fin.sound
  };
}

export const ORACLE_STYLES = FINISHES.map(oracleStyle);
