/**
 * The Oracle faces exactly as drawn in the Archive Dice design (Face.dc.html):
 * the same finish data and the same SVG markup, filled in per finish and pip
 * count. Keep this file a faithful port of the design, so the dice textures
 * match it pixel for pixel; material behaviour lives in oracle.js.
 */

function corners(o, s) {
  // stepped art-deco corner marks
  const a = o, b = 100 - o;
  return "M" + a + " " + (a + s * 2) + " H" + (a + s) + " V" + (a + s) + " H" + (a + s * 2) + " V" + a +
    " M" + b + " " + (a + s * 2) + " H" + (b - s) + " V" + (a + s) + " H" + (b - s * 2) + " V" + a +
    " M" + a + " " + (b - s * 2) + " H" + (a + s) + " V" + (b - s) + " H" + (a + s * 2) + " V" + b +
    " M" + b + " " + (b - s * 2) + " H" + (b - s) + " V" + (b - s) + " H" + (b - s * 2) + " V" + b;
}

function circle(r) {
  return "M50 " + (50 - r) + " A" + r + " " + r + " 0 1 0 50 " + (50 + r) + " A" + r + " " + r + " 0 1 0 50 " + (50 - r) + " Z";
}

function ticks() {
  let d = "";
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    const r1 = i % 2 ? 37.5 : 36, r2 = 40;
    d += " M" + (50 + Math.cos(t) * r1).toFixed(2) + " " + (50 + Math.sin(t) * r1).toFixed(2) +
      " L" + (50 + Math.cos(t) * r2).toFixed(2) + " " + (50 + Math.sin(t) * r2).toFixed(2);
  }
  return d;
}

const base = {
  radius: 12, frame1: "#000", frame2: "#000", frame3: "#000", frameWidth: 0, frameInset: 0,
  glow: "#000", glowOpacity: 0, swirl: "M0 0", swirlOpacity: 0,
  panelInset: 0, panelRx: 0, panelFill: "none", panelStroke: "none", panelWidth: 0,
  pattern: "M0 0", patternColor: "none", patternWidth: 0, patternOpacity: 1,
  gloss: 0, pipR: 7, pipShine: 0.4
};

/** Finish data, verbatim from the design. */
export const DESIGN_FINISHES = {
  brass: { ...base,
    body1: "#1d2020", body2: "#040505", radius: 13,
    frame1: "#6b4f1f", frame2: "#e8cb82", frame3: "#5a4118", frameWidth: 7, frameInset: 3.5,
    rim: "#c9a55a", pip1: "#3fe3ad", pip2: "#08463a", pipR: 6.6, pipShine: 0.55, gloss: 0.07
  },
  ledger: { ...base,
    body1: "#223254", body2: "#0f1829",
    frame1: "#0a111f", frame2: "#2b3c5e", frame3: "#0a111f", frameWidth: 2, frameInset: 1,
    panelInset: 7, panelRx: 6, panelStroke: "#475c86", panelWidth: 0.8,
    pattern: "M50 13 L87 50 L50 87 L13 50 Z M50 19 L81 50 L50 81 L19 50 Z M7 7 L17 17 M93 7 L83 17 M7 93 L17 83 M93 93 L83 83",
    patternColor: "#475c86", patternWidth: 0.8,
    rim: "#3a2f14", pip1: "#f0d488", pip2: "#8a6a2c", pipR: 6.2, pipShine: 0.25
  },
  resin: { ...base,
    body1: "#2c3431", body2: "#070a09", radius: 20,
    glow: "#1fbf88", glowOpacity: 0.7,
    swirl: "M20 72 C30 38 66 82 80 34 M28 28 C44 50 58 26 74 62", swirlOpacity: 0.55,
    rim: "#5b4518", pip1: "#f2d17e", pip2: "#8d6b2d", pipR: 7.4, pipShine: 0.45, gloss: 0.1
  },
  steel: { ...base,
    body1: "#5a6066", body2: "#1b1e21",
    frame1: "#9aa1a7", frame2: "#3a3f44", frame3: "#15181a", frameWidth: 2, frameInset: 1,
    panelInset: 12, panelRx: 8, panelFill: "#2a2e32", panelStroke: "#0c0e10", panelWidth: 2.4,
    pattern: "M5 6.5 A1.5 1.5 0 1 0 8 6.5 A1.5 1.5 0 1 0 5 6.5 Z M92 6.5 A1.5 1.5 0 1 0 95 6.5 A1.5 1.5 0 1 0 92 6.5 Z M5 93.5 A1.5 1.5 0 1 0 8 93.5 A1.5 1.5 0 1 0 5 93.5 Z M92 93.5 A1.5 1.5 0 1 0 95 93.5 A1.5 1.5 0 1 0 92 93.5 Z",
    patternColor: "#0c0e10", patternWidth: 1,
    rim: "#07090a", pip1: "#39e0bc", pip2: "#05372d", pipR: 6.8, pipShine: 0.35, gloss: 0.05
  },
  archivist: { ...base,
    body1: "#2a2b2a", body2: "#121313",
    pattern: "M8 8 H92 V92 H8 Z M12 12 H88 V88 H12 Z " + corners(12, 4.5) + " M8 8 L12 12 M92 8 L88 12 M8 92 L12 88 M92 92 L88 88",
    patternColor: "#c9a24f", patternWidth: 0.9,
    rim: "#8f8468", pip1: "#f4ecd6", pip2: "#b9ab8b", pipR: 7, pipShine: 0.2
  },
  sigil: { ...base,
    body1: "#17181b", body2: "#030304",
    pattern: circle(40) + " " + circle(35) + " " + circle(11) +
      " M50 15 L85 50 L50 85 L15 50 Z M25.25 25.25 L74.75 25.25 L74.75 74.75 L25.25 74.75 Z" +
      " M50 15 L80.3 67.5 L19.7 67.5 Z" + ticks(),
    patternColor: "#caa75a", patternWidth: 0.75,
    rim: "#caa75a", pip1: "#5ff0df", pip2: "#07615a", pipR: 5.8, pipShine: 0.6, gloss: 0.08
  }
};

/** Pip positions from the design (face units, y down). */
const a = 28, b = 72, c = 50;
export const DESIGN_PIP_LAYOUTS = {
  1: [[c, c]],
  2: [[a, a], [b, b]],
  3: [[a, a], [c, c], [b, b]],
  4: [[a, a], [b, a], [a, b], [b, b]],
  5: [[a, a], [b, a], [c, c], [a, b], [b, b]],
  6: [[a, 26], [b, 26], [a, c], [b, c], [a, 74], [b, 74]]
};

/** The design's per-face values (Face.dc.html renderVals). */
function faceVals(key, value) {
  const f = { ...(DESIGN_FINISHES[key] ?? DESIGN_FINISHES.brass) };
  f.frameX = f.frameInset;
  f.frameW = 100 - f.frameInset * 2;
  f.frameRx = Math.max(0, f.radius - f.frameInset);
  f.panelX = f.panelInset;
  f.panelW = f.panelInset ? 100 - f.panelInset * 2 : 0;
  const v = Math.min(6, Math.max(1, Number(value)));
  const r = f.pipR;
  const pips = [];
  for (let i = 0; i < 6; i++) {
    const p = DESIGN_PIP_LAYOUTS[v][i];
    if (p) pips.push({ x: p[0], y: p[1], r, rimR: r + 1.5, hx: p[0] - r * 0.32, hy: p[1] - r * 0.34, hr: r * 0.3 });
    else pips.push({ x: -10, y: -10, r: 0, rimR: 0, hx: -10, hy: -10, hr: 0 });
  }
  return { f, uid: "d-" + key + "-" + v, pips };
}

/**
 * The design's face as a standalone SVG document (the Face.dc.html markup with
 * its values filled in).
 * @param {string} key    Finish: brass, ledger, resin, steel, archivist or sigil.
 * @param {number} value  Pip count, 1-6.
 * @param {number} size   Pixel size of the square image.
 */
export function designFaceSvg(key, value, size = 512) {
  const { f, uid, pips } = faceVals(key, value);
  const pipMarkup = pips.map(p =>
    `<circle cx="${p.x}" cy="${p.y}" r="${p.rimR}" fill="${f.rim}"/>` +
    `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="url(#${uid}-pip)"/>` +
    `<circle cx="${p.hx}" cy="${p.hy}" r="${p.hr}" fill="#ffffff" opacity="${f.pipShine}"/>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
    `<defs>` +
    `<linearGradient id="${uid}-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${f.body1}"/><stop offset="1" stop-color="${f.body2}"/></linearGradient>` +
    `<linearGradient id="${uid}-frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${f.frame1}"/><stop offset="0.45" stop-color="${f.frame2}"/><stop offset="1" stop-color="${f.frame3}"/></linearGradient>` +
    `<radialGradient id="${uid}-glow" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="${f.glow}" stop-opacity="0.95"/><stop offset="0.6" stop-color="${f.glow}" stop-opacity="0.35"/><stop offset="1" stop-color="${f.glow}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${uid}-pip" cx="0.38" cy="0.34" r="0.75"><stop offset="0" stop-color="${f.pip1}"/><stop offset="1" stop-color="${f.pip2}"/></radialGradient>` +
    `<filter id="${uid}-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter>` +
    `</defs>` +
    `<rect x="0" y="0" width="100" height="100" rx="${f.radius}" fill="url(#${uid}-body)"/>` +
    `<ellipse cx="50" cy="55" rx="44" ry="42" fill="url(#${uid}-glow)" opacity="${f.glowOpacity}"/>` +
    `<path d="${f.swirl}" fill="none" stroke="${f.glow}" stroke-width="5" stroke-linecap="round" opacity="${f.swirlOpacity}" filter="url(#${uid}-blur)"/>` +
    `<rect x="${f.panelX}" y="${f.panelX}" width="${f.panelW}" height="${f.panelW}" rx="${f.panelRx}" fill="${f.panelFill}" stroke="${f.panelStroke}" stroke-width="${f.panelWidth}"/>` +
    `<path d="${f.pattern}" fill="none" stroke="${f.patternColor}" stroke-width="${f.patternWidth}" stroke-linejoin="round" stroke-linecap="round" opacity="${f.patternOpacity}"/>` +
    `<rect x="${f.frameX}" y="${f.frameX}" width="${f.frameW}" height="${f.frameW}" rx="${f.frameRx}" fill="none" stroke="url(#${uid}-frame)" stroke-width="${f.frameWidth}"/>` +
    `<path d="M9 30 Q9 9 30 9 L64 9 Q30 16 9 52 Z" fill="#ffffff" opacity="${f.gloss}"/>` +
    pipMarkup +
    `</svg>`;
}
