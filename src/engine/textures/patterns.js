/**
 * Code-generated surface patterns (wood, cracks, concrete, brushed metal...).
 * Everything is seeded so a style always looks the same.
 */

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Seeded 2D value noise in [0, 1]. */
export function makeNoise(rng) {
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const vals = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    perm[i] = i;
    vals[i] = rng.next();
  }
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < size; i++) perm[size + i] = perm[i];
  const fade = t => t * t * (3 - 2 * t);
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const v00 = vals[perm[X + perm[Y]]], v10 = vals[perm[X + 1 + perm[Y]]];
    const v01 = vals[perm[X + perm[Y + 1]]], v11 = vals[perm[X + 1 + perm[Y + 1]]];
    const u = fade(xf), v = fade(yf);
    return (v00 * (1 - u) + v10 * u) * (1 - v) + (v01 * (1 - u) + v11 * u) * v;
  };
  noise.fbm = (x, y, octaves = 4) => {
    let sum = 0, amp = 0.5, f = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x * f, y * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  };
  return noise;
}

/**
 * Per-pixel pass over the colour/height/rough layers.
 * fn(x, y, px) mutates px = {r, g, b, h, rough} (0-255 values).
 */
export function pixelPass(p, fn) {
  const { width: w, height: h } = p;
  const color = p.ctx.color.getImageData(0, 0, w, h);
  const height = p.ctx.height.getImageData(0, 0, w, h);
  const rough = p.ctx.rough.getImageData(0, 0, w, h);
  const c = color.data, hd = height.data, rd = rough.data;
  const px = { r: 0, g: 0, b: 0, h: 0, rough: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      px.r = c[i];
      px.g = c[i + 1];
      px.b = c[i + 2];
      px.h = hd[i];
      px.rough = rd[i];
      fn(x, y, px);
      c[i] = px.r;
      c[i + 1] = px.g;
      c[i + 2] = px.b;
      hd[i] = hd[i + 1] = hd[i + 2] = px.h;
      rd[i] = rd[i + 1] = rd[i + 2] = px.rough;
    }
  }
  p.ctx.color.putImageData(color, 0, 0);
  p.ctx.height.putImageData(height, 0, 0);
  p.ctx.rough.putImageData(rough, 0, 0);
}

const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Soft brightness/height variation, e.g. for bone, concrete, lacquer. */
export function mottle(p, rng, { scale = 0.02, amount = 0.12, height = 0, rough = 0, tint = null, octaves = 4 } = {}) {
  const noise = makeNoise(rng);
  const t = tint ? hexToRgb(tint) : null;
  pixelPass(p, (x, y, px) => {
    const n = noise.fbm(x * scale, y * scale, octaves) - 0.5;
    const f = 1 + n * 2 * amount;
    px.r = clamp(px.r * f);
    px.g = clamp(px.g * f);
    px.b = clamp(px.b * f);
    if (t && n > 0) {
      const k = n * 2 * amount;
      px.r = clamp(px.r + (t[0] - px.r) * k);
      px.g = clamp(px.g + (t[1] - px.g) * k);
      px.b = clamp(px.b + (t[2] - px.b) * k);
    }
    if (height) px.h = clamp(px.h + n * 255 * height);
    if (rough) px.rough = clamp(px.rough + n * 255 * rough);
  });
}

/** Scattered small dots. */
export function speckle(p, rng, { count = 400, color = "#000", size = [0.5, 1.5], height = -0.08, opacity = 0.35 } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rng.next() * p.width, y = rng.next() * p.height;
    const r = rng.range(size[0], size[1]);
    p.disc(x, y, r, { color, height: 0.5 + height, opacity: opacity * rng.range(0.5, 1) });
  }
}

/** Straight wood grain with warped rings, drawn per cell so each face gets its own board. */
export function woodGrain(p, rng, { light, dark, frequency = 0.09, warp = 9, cells = [] } = {}) {
  const noise = makeNoise(rng);
  const L = hexToRgb(light), D = hexToRgb(dark);
  // Each cell gets a random offset and slight angle so faces don't look copy-pasted.
  const cellOf = (x, y) => cells.find(c => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
  const params = new Map(cells.map(c => [c, { off: rng.range(0, 500), ang: rng.range(-0.12, 0.12) }]));
  pixelPass(p, (x, y, px) => {
    const c = cellOf(x, y);
    const prm = c ? params.get(c) : { off: 0, ang: 0 };
    const yy = y * Math.cos(prm.ang) + x * Math.sin(prm.ang) + prm.off;
    const w = noise.fbm(x * 0.004, yy * 0.03, 3) * warp;
    const ring = Math.sin((yy + w * 6) * frequency);
    const fine = noise(x * 0.3, yy * 1.5);
    let t = Math.pow(0.5 + 0.5 * ring, 3) * 0.8 + fine * 0.25;
    t = Math.min(1, t);
    px.r = L[0] + (D[0] - L[0]) * t;
    px.g = L[1] + (D[1] - L[1]) * t;
    px.b = L[2] + (D[2] - L[2]) * t;
    px.h = clamp(128 - t * 18 + fine * 10);
    px.rough = clamp(px.rough + (t - 0.5) * 30);
  });
}

/** Branching hairline cracks. */
export function cracks(p, rng, { count = 6, color = "#555", width = 1, length = 180, height = 0.2 } = {}) {
  const crack = (x, y, ang, len, w, depth) => {
    const pts = [[x, y]];
    let a = ang;
    for (let s = 0; s < len; s += 6) {
      a += rng.range(-0.45, 0.45);
      x += Math.cos(a) * 6;
      y += Math.sin(a) * 6;
      pts.push([x, y]);
      if (depth < 2 && rng.next() < 0.05) crack(x, y, a + rng.sign() * rng.range(0.5, 1.2), len * 0.4, w * 0.7, depth + 1);
    }
    const path = ctx => {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [px, py] of pts) ctx.lineTo(px, py);
    };
    p.strokePath(path, w * 2.5, { color: "rgba(255,255,255,0.25)", opacity: 0.5 });
    p.strokePath(path, w, { color, height, rough: 0.8 });
  };
  for (let i = 0; i < count; i++) {
    crack(rng.next() * p.width, rng.next() * p.height, rng.range(0, Math.PI * 2), length * rng.range(0.6, 1.4), width, 0);
  }
}

/** Air-bubble pits (concrete, cast metal). */
export function pits(p, rng, { count = 300, size = [0.8, 3], color = "#3a3a3a" } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rng.next() * p.width, y = rng.next() * p.height;
    const r = rng.range(size[0], size[1]);
    p.disc(x, y, r, {
      color: Painter_radial(x, y, r, [[0, color], [1, "rgba(0,0,0,0)"]]),
      height: Painter_radial(x, y, r, [[0, "rgb(20,20,20)"], [1, "rgba(128,128,128,0)"]]),
      rough: 0.95
    });
  }
}

function Painter_radial(x, y, r, stops) {
  return ctx => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    for (const [t, c] of stops) g.addColorStop(t, c);
    return g;
  };
}

/** Short straight scratches / tool marks. */
export function scratches(p, rng, { count = 40, color = "#444", length = [8, 30], width = 1.2, opacity = 0.6 } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rng.next() * p.width, y = rng.next() * p.height;
    const a = rng.range(0, Math.PI), l = rng.range(length[0], length[1]);
    p.strokePath(ctx => {
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }, width, { color, height: 0.3, opacity });
  }
}

/** Directional brushed-metal streaks. */
export function brushed(p, rng, { amount = 0.18 } = {}) {
  const noise = makeNoise(rng);
  pixelPass(p, (x, y, px) => {
    const s = noise(x * 0.01, y * 1.7) * 0.7 + noise(x * 0.05, y * 4.3) * 0.3 - 0.5;
    const f = 1 + s * 2 * amount;
    px.r = clamp(px.r * f);
    px.g = clamp(px.g * f);
    px.b = clamp(px.b * f);
    px.h = clamp(128 + s * 20);
    px.rough = clamp(px.rough + s * 40);
  });
}

/** Tiny glinting flakes that light up in the emissive layer. */
export function sparkles(p, rng, { count = 300, color = "#ffffff", glow = "#8aa4ff", size = [0.4, 1.2] } = {}) {
  for (let i = 0; i < count; i++) {
    const x = rng.next() * p.width, y = rng.next() * p.height;
    const r = rng.range(size[0], size[1]);
    p.disc(x, y, r, { color, emissive: glow, rough: 0.1, metal: 1, opacity: rng.range(0.4, 1) });
  }
}

/** Baroque scrollwork: raised spiral tendrils with leaf tips on a darkened ground. */
export function filigree(p, rng, cell, { raised = "#d6d6d6", ground = "#4a4a4a" } = {}) {
  const { x: cx, y: cy, w, h } = cell;
  p.fillRect(cx, cy, w, h, { color: ground, height: 0.35, rough: 0.55 });
  const unit = Math.min(w, h);
  const spiral = (x, y, r0, turns, dir, rot) => {
    const pts = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = rot + dir * t * turns * Math.PI * 2;
      const r = r0 * (1 - t * 0.85);
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return ctx => {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [px, py] of pts) ctx.lineTo(px, py);
    };
  };
  const strokes = [];
  // Symmetric layout: four curls around the cell centre, plus smaller corner curls.
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 4;
    const d = unit * 0.24;
    strokes.push(spiral(cx + w / 2 + Math.cos(a) * d, cy + h / 2 + Math.sin(a) * d, unit * 0.16, 1.3, i % 2 ? 1 : -1, a + Math.PI));
    const d2 = unit * 0.4;
    strokes.push(spiral(cx + w / 2 + Math.cos(a) * d2, cy + h / 2 + Math.sin(a) * d2, unit * 0.08, 1.1, i % 2 ? -1 : 1, a));
  }
  for (let i = 0; i < 10; i++) {
    const x = cx + rng.range(0.1, 0.9) * w, y = cy + rng.range(0.1, 0.9) * h;
    strokes.push(spiral(x, y, unit * rng.range(0.04, 0.08), rng.range(0.8, 1.4), rng.sign(), rng.range(0, 6.28)));
  }
  const lw = unit * 0.022;
  for (const s of strokes) p.strokePath(s, lw * 1.9, { color: "#2a2a2a", height: 0.3, opacity: 0.8 });
  for (const s of strokes) p.strokePath(s, lw, { color: raised, height: 0.85, rough: 0.28 });
}
