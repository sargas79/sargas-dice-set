import { mottle, insetPath, mix } from "./helpers.js";
import { DESIGN_FINISHES, DESIGN_PIP_LAYOUTS, DESIGN_POLY_FINISHES, DESIGN_NUMBER_FONT, designFaceSvg, designPolyLabel } from "./oracle-design.js";

/**
 * "Oracle" collection: seven finishes ported from the Archive Dice design
 * (Brass Ward, Midnight Ledger, Specimen Resin, Containment Steel, Archivist,
 * Sigil, Drowned Idol). The colour of every d6 face is the design's own SVG
 * face (oracle-design.js), rasterised as the texture, so it matches the design
 * exactly. The same shapes are also drawn into the relief, metalness and glow
 * layers, so frames and gilt shine, panels sink and gem pips glow under the
 * 3D lighting. The d4-d100 follow the design's polyhedral set: body gradient,
 * edge metal on the bevels, inset border, glow, the Sigil ring and numbers in
 * Cormorant SC with the finish's fill and outline.
 */

/**
 * The design's finish data, with its "nothing here" placeholders ('none',
 * 'M0 0', zero opacity) turned into nulls for the relief/metal/glow layers.
 */
const FACES = Object.fromEntries(
  Object.entries(DESIGN_FINISHES).map(([key, d]) => [key, {
    ...d,
    glow: d.glowOpacity > 0 ? d.glow : null,
    swirl: d.swirlOpacity > 0 ? d.swirl : null,
    panelFill: d.panelFill === "none" ? null : d.panelFill,
    panelStroke: d.panelStroke === "none" ? null : d.panelStroke,
    pattern: d.pattern === "M0 0" ? null : d.pattern,
    patternColor: d.patternColor === "none" ? null : d.patternColor
  }])
);
const LAYOUT = DESIGN_PIP_LAYOUTS;

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
    body: { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }, gilt: true, gem: true },
  { key: "drowned", name: "Drowned Idol", label: "DrownedIdol", sound: "stone",
    body: { roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.35 }, gem: true, frameMetal: true, bloom: true }
];

/** Bevel edges that are metal in the design's polyhedral set (brass, gilt, steel, verdigris bronze). */
const METAL_EDGES = new Set(["brass", "steel", "archivist", "sigil", "drowned"]);
const POLY_TYPE = { 4: "d4", 8: "d8", 10: "d10", 12: "d12", 20: "d20" };

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
  if (f.slitOn) {
    // Drowned Idol: slit pupils, which stay dark in the glow layer.
    inDesign(p, face, { color: "#081006", emissive: "#000000", height: 0.36, opacity: f.slitOn }, ctx => {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.2, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  inDesign(p, face, { color: "#ffffff", opacity: f.pipShine * 0.6 }, ctx => {
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ------------------------------------------------------------------ */
/* Polyhedral faces (the design's Poly component)                      */
/* ------------------------------------------------------------------ */

/** Face circumradius in px, and px per design unit (the design draws each die ~94 units wide). */
function faceScale(face) {
  const R = Math.max(...face.polygon.map(([x, y]) => Math.hypot(x - face.cx, y - face.cy)));
  return { R, k: R / 30 };
}

/** Body gradient, glow, inset border and edge metal of one polyhedral face. */
function drawPolyFace(p, face, pf, fin) {
  const { R, k } = faceScale(face);
  const x0 = face.cx - R, y0 = face.cy - R;
  const body = ctx => {
    const g = ctx.createLinearGradient(x0, y0, x0 + 2 * R, y0 + 2 * R);
    g.addColorStop(0, pf.body1);
    g.addColorStop(1, pf.body2);
    return g;
  };
  p.fillRect(face.cell.x, face.cell.y, face.cell.w, face.cell.h, { color: body });

  if (pf.glowOpacity > 0) {
    // Glow on the face, clipped to it, also lighting the emissive layer.
    const glow = ctx => {
      const g = ctx.createRadialGradient(face.cx, face.cy, 0, face.cx, face.cy, R * 0.78);
      g.addColorStop(0, withAlpha(pf.glow, 0.95));
      g.addColorStop(0.6, withAlpha(pf.glow, 0.3));
      g.addColorStop(1, withAlpha(pf.glow, 0));
      return g;
    };
    p.clip(face.path, () => p.fillPath(c => c.ellipse(face.cx, face.cy, R * 0.78, R * 0.74, 0, 0, Math.PI * 2), { color: glow, emissive: glow, opacity: pf.glowOpacity }));
  }
  if (pf.insetOn) {
    p.strokePath(insetPath(face, 0.78), Math.max(1, 0.8 * k), { color: pf.insetColor, height: 0.42, ...(METAL_EDGES.has(fin.key) ? { metal: 1, rough: 0.3 } : {}) });
  }
  // The design strokes every facet with the edge colour; here it runs along the face border.
  p.strokePath(face.path, Math.max(1, pf.edgeW * k), { color: pf.edge, height: 0.56, ...(METAL_EDGES.has(fin.key) ? { metal: 1, rough: 0.28 } : {}) });
}

/** A number in the design's font, fill and outline (the outline is painted first, like paint-order: stroke). */
function drawPolyNumber(p, pf, fin, text, x, y, size, rot, ringMax) {
  const font = `${DESIGN_NUMBER_FONT.weight} ${Math.round(size)}px "${DESIGN_NUMBER_FONT.family}", Georgia, serif`;
  p.transform(x, y, rot, () => {
    if (ringMax) {
      // Sigil: two rings round the number (0.78 and 0.9 of the font size), kept inside the face.
      const fit = Math.min(1, ringMax / (size * 0.9));
      for (const [rr, w] of [[0.78, 0.8], [0.9, 0.5]]) {
        p.strokePath(c => c.arc(0, 0, size * rr * fit, 0, Math.PI * 2), Math.max(1, (size * w) / 20), { color: pf.edge, height: 0.56, metal: 1, rough: 0.3 });
      }
    }
    const text2 = (surface, stroke) => p.apply(surface, ctx => {
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (stroke) {
        ctx.lineWidth = stroke;
        ctx.lineJoin = "round";
        ctx.strokeText(text, 0, size * 0.03);
      } else ctx.fillText(text, 0, size * 0.03);
    });
    if (pf.numStroke !== "none" && pf.numStrokeW > 0) text2({ color: pf.numStroke, height: 0.44 }, (size * pf.numStrokeW) / 10);
    text2({ color: pf.num, height: 0.4, rough: 0.35, ...(fin.gem ? { emissive: withAlpha(pf.num, 0.55) } : {}) });
  });
}

/** Numbers on d4-d20 faces (and the d100 tens die), laid out like the default numerals. */
function drawPolyMarks(p, face, pf, fin) {
  const type = face.variant === "tens" ? "d100" : POLY_TYPE[face.kind];
  if (face.vertexLabels) {
    for (const { label, px } of face.vertexLabels) {
      const dx = px[0] - face.cx, dy = px[1] - face.cy;
      drawPolyNumber(p, pf, fin, label, face.cx + dx * 0.52, face.cy + dy * 0.52, face.inradius * 0.7, Math.atan2(dx, -dy), 0);
    }
    return;
  }
  const label = face.variant === "hidden" ? "?" : face.variant === "tens" ? designPolyLabel("d100", (face.value % 10) * 10) : designPolyLabel(type, face.kind === 10 && face.value === 10 ? 0 : face.value);
  const size = face.inradius * (face.kind === 10 ? 1.2 : face.kind === 20 ? 1.2 : face.kind === 8 ? 1.25 : 1.3);
  const yOff = face.kind === 10 ? face.inradius * 0.2 : face.kind === 20 ? face.inradius * 0.12 : face.kind === 8 ? face.inradius * 0.1 : 0;
  drawPolyNumber(p, pf, fin, label, face.cx, face.cy + yOff, size, 0, pf.ringOn > 0 ? face.inradius * 0.9 - Math.abs(yOff) : 0);
}

function oracleStyle(fin) {
  const f = FACES[fin.key];
  const pf = DESIGN_POLY_FINISHES[fin.key];
  return {
    id: `oracle-${fin.key}`,
    name: fin.name,
    label: `SARGAS.Style.Oracle${fin.label}`,
    collection: "oracle",
    shape: "rounded",
    roundness: +(f.radius / 50).toFixed(2),
    emissive: !!(fin.gem || f.glow),
    /** The design's face artwork for a d6 value, as an SVG document. */
    faceSvg: (value, size) => designFaceSvg(fin.key, value, size),
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
    fonts: [DESIGN_NUMBER_FONT],
    decorateFace(p, face) {
      if (face.kind === 6) drawFaceArt(p, face, f, fin);
      else if (POLY_TYPE[face.kind]) drawPolyFace(p, face, pf, fin);
    },
    drawMarks(p, face) {
      // d6 (and d3, which reuses the d6) pips follow the design's face layout.
      if (face.kind === 6 && (!face.variant || face.variant === "d3")) {
        const count = face.variant === "d3" ? ((face.value - 1) % 3) + 1 : face.value;
        for (const [x, y] of LAYOUT[count]) drawPip(p, face, f, fin, x, y);
        return true;
      }
      // d4-d20 and the d100 dice use the design's polyhedral numbers; coins and Fate/"?" d6s use the defaults.
      if (POLY_TYPE[face.kind]) {
        drawPolyMarks(p, face, pf, fin);
        return true;
      }
      return false;
    },
    decorateBody(p, cell, rng, ctx) {
      // The bevels between polyhedral faces carry the design's edge colour: metal where the design's
      // edges are metal; thin painted lines (Ledger, Resin) only tint the body so the bands don't overpower.
      if (ctx.poly.kind === 6 || !POLY_TYPE[ctx.poly.kind]) return;
      const metal = METAL_EDGES.has(fin.key);
      p.fillRect(cell.x, cell.y, cell.w, cell.h, { color: metal ? pf.edge : mix(pf.body2, pf.edge, 0.35), rough: metal ? 0.3 : 0.6, ...(metal ? { metal: 1 } : {}) });
    },
    physics: fin.physics ?? { mass: 1, friction: 0.33, restitution: 0.35 },
    sound: fin.sound
  };
}

export const ORACLE_STYLES = FINISHES.map(oracleStyle);
