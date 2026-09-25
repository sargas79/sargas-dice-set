/**
 * Pure geometry for the supported dice: vertices, faces, face values and the
 * rotation symmetry group of each solid. No Three.js or cannon-es here so the
 * maths can be unit-tested in Node.
 */

const PHI = (1 + Math.sqrt(5)) / 2;
const EPS = 1e-6;

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  near: (a, b, eps = 1e-4) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps && Math.abs(a[2] - b[2]) < eps
};

/** 3x3 matrices stored row-major as flat arrays of 9. */
export const m3 = {
  mulVec: (m, v) => [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
  ],
  /** Matrix whose columns are a, b, c. */
  fromColumns: (a, b, c) => [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]],
  transpose: m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]],
  mul: (a, b) => {
    const r = new Array(9);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
      }
    }
    return r;
  },
  /** Unit quaternion [x, y, z, w] from a rotation matrix. */
  toQuaternion: m => {
    const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m;
    const tr = m00 + m11 + m22;
    let x, y, z, w;
    if (tr > 0) {
      const s = 0.5 / Math.sqrt(tr + 1);
      w = 0.25 / s;
      x = (m21 - m12) * s;
      y = (m02 - m20) * s;
      z = (m10 - m01) * s;
    } else if (m00 > m11 && m00 > m22) {
      const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
      w = (m21 - m12) / s;
      x = 0.25 * s;
      y = (m01 + m10) / s;
      z = (m02 + m20) / s;
    } else if (m11 > m22) {
      const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
      w = (m02 - m20) / s;
      x = (m01 + m10) / s;
      y = 0.25 * s;
      z = (m12 + m21) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
      w = (m10 - m01) / s;
      x = (m02 + m20) / s;
      y = (m12 + m21) / s;
      z = 0.25 * s;
    }
    const l = Math.hypot(x, y, z, w);
    return [x / l, y / l, z / l, w / l];
  }
};

/* ------------------------------------------------------------------ */
/* Vertex sets                                                         */
/* ------------------------------------------------------------------ */

function signs(n) {
  const out = [];
  for (let i = 0; i < 1 << n; i++) out.push(Array.from({ length: n }, (_, k) => (i >> k) & 1 ? -1 : 1));
  return out;
}

/** Coin: a thin 16-sided prism (half-thickness relative to its radius). */
const COIN_SIDES = 16;
const COIN_HALF_THICKNESS = 0.13;

const VERTEX_SETS = {
  2: () => {
    const verts = [];
    for (let k = 0; k < COIN_SIDES; k++) {
      const a = (k / COIN_SIDES) * Math.PI * 2;
      verts.push([Math.cos(a), COIN_HALF_THICKNESS, Math.sin(a)], [Math.cos(a), -COIN_HALF_THICKNESS, Math.sin(a)]);
    }
    return verts;
  },
  4: () => [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  6: () => signs(3),
  8: () => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
  10: () => {
    // Pentagonal trapezohedron. Poles at +-1; the ring height makes each kite planar.
    const c = Math.cos(Math.PI / 5);
    const e = (1 - c) / (1 + c);
    const verts = [[0, 1, 0], [0, -1, 0]];
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI) / 5;
      verts.push([Math.cos(a), k % 2 === 0 ? e : -e, Math.sin(a)]);
    }
    return verts;
  },
  12: () => {
    const verts = signs(3);
    const ip = 1 / PHI;
    for (const [a, b] of signs(2)) {
      verts.push([0, a * ip, b * PHI]);
      verts.push([a * ip, b * PHI, 0]);
      verts.push([a * PHI, 0, b * ip]);
    }
    return verts;
  },
  20: () => {
    const verts = [];
    for (const [a, b] of signs(2)) {
      verts.push([0, a, b * PHI]);
      verts.push([a, b * PHI, 0]);
      verts.push([a * PHI, 0, b]);
    }
    return verts;
  }
};

/** Circumradius of each die, in world units (a d6 edge is about 0.9). */
const DIE_RADIUS = { 2: 0.7, 4: 0.95, 6: 0.8, 8: 0.85, 10: 0.82, 12: 0.85, 20: 0.88 };

/* ------------------------------------------------------------------ */
/* Convex hull (brute force: the solids have at most 20 vertices)      */
/* ------------------------------------------------------------------ */

function hullFaces(verts) {
  const planes = [];
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        let normal = v3.cross(v3.sub(verts[j], verts[i]), v3.sub(verts[k], verts[i]));
        if (v3.len(normal) < EPS) continue;
        normal = v3.norm(normal);
        let d = v3.dot(normal, verts[i]);
        let pos = 0, neg = 0;
        for (const v of verts) {
          const s = v3.dot(normal, v) - d;
          if (s > 1e-5) pos++;
          else if (s < -1e-5) neg++;
        }
        if (pos && neg) continue;
        if (pos) {
          normal = v3.scale(normal, -1);
          d = -d;
        }
        if (planes.some(p => v3.near(p.normal, normal) && Math.abs(p.d - d) < 1e-4)) continue;
        planes.push({ normal, d });
      }
    }
  }
  return planes.map(({ normal, d }) => {
    const idx = verts.map((v, i) => i).filter(i => Math.abs(v3.dot(normal, verts[i]) - d) < 1e-5);
    const center = v3.scale(idx.reduce((acc, i) => v3.add(acc, verts[i]), [0, 0, 0]), 1 / idx.length);
    // Order counter-clockwise when seen from outside.
    const ref = v3.norm(v3.sub(verts[idx[0]], center));
    const ref2 = v3.cross(normal, ref);
    idx.sort((a, b) => {
      const pa = v3.sub(verts[a], center), pb = v3.sub(verts[b], center);
      return Math.atan2(v3.dot(pa, ref2), v3.dot(pa, ref)) - Math.atan2(v3.dot(pb, ref2), v3.dot(pb, ref));
    });
    return { verts: idx, normal, center };
  });
}

/* ------------------------------------------------------------------ */
/* Rotation group                                                      */
/* ------------------------------------------------------------------ */

function frame(a, b) {
  const e1 = v3.norm(a);
  const e2 = v3.norm(v3.sub(b, v3.scale(e1, v3.dot(b, e1))));
  return m3.fromColumns(e1, e2, v3.cross(e1, e2));
}

/** All proper rotations mapping the vertex set onto itself. */
function rotationGroup(verts) {
  const r0 = v3.len(verts[0]);
  // Pick a reference vertex pair that is not colinear.
  const a = verts[0];
  const b = verts.find(v => v3.len(v3.cross(v3.norm(a), v3.norm(v))) > 0.1);
  const ra = v3.len(a), rb = v3.len(b), ab = v3.dot(a, b);
  const src = m3.transpose(frame(a, b));
  const out = [];
  for (const p of verts) {
    if (Math.abs(v3.len(p) - ra) > 1e-4) continue;
    for (const q of verts) {
      if (p === q || Math.abs(v3.len(q) - rb) > 1e-4 || Math.abs(v3.dot(p, q) - ab) > 1e-4) continue;
      const R = m3.mul(frame(p, q), src);
      const ok = verts.every(v => {
        const w = m3.mulVec(R, v);
        return verts.some(u => v3.near(u, w, 1e-4 * Math.max(1, r0)));
      });
      if (ok && !out.some(M => M.every((x, i) => Math.abs(x - R[i]) < 1e-4))) out.push(R);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Face values and text orientation                                    */
/* ------------------------------------------------------------------ */

/** Give every face a value so that opposite faces sum to N + 1. */
function assignFaceValues(faces) {
  const n = faces.length;
  // Visit faces in a stable order that walks around the solid (by latitude, then longitude).
  const order = faces
    .map((f, i) => i)
    .sort((i, j) => {
      const a = faces[i].normal, b = faces[j].normal;
      if (Math.abs(a[1] - b[1]) > 1e-3) return b[1] - a[1];
      return Math.atan2(a[2], a[0]) - Math.atan2(b[2], b[0]);
    });
  let next = 1;
  for (const i of order) {
    if (faces[i].value) continue;
    faces[i].value = next;
    const opp = faces.findIndex(f => v3.near(f.normal, v3.scale(faces[i].normal, -1), 1e-3));
    if (opp >= 0 && !faces[opp].value) faces[opp].value = n + 1 - next;
    next++;
    while (faces.some(f => f.value === next)) next++;
  }
}

/** Direction on each face that the top of the number points to. */
function faceUp(kind, face, verts) {
  const c = face.center;
  if (kind === 6) {
    const mid = v3.lerp(verts[face.verts[0]], verts[face.verts[1]], 0.5);
    return v3.norm(v3.sub(mid, c));
  }
  if (kind === 10) {
    // Toward the pole vertex of the kite.
    const pole = face.verts.reduce((best, i) => (Math.abs(verts[i][1]) > Math.abs(verts[best][1]) ? i : best));
    return v3.norm(v3.sub(verts[pole], c));
  }
  return v3.norm(v3.sub(verts[face.verts[0]], c));
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const cache = new Map();

/**
 * @param {number} kind  2 (coin), 4, 6, 8, 10, 12 or 20.
 * @returns {{
 *   kind:number, radius:number, vertices:number[][], valueOn:"face"|"vertex",
 *   faces:{verts:number[], normal:number[], center:number[], value:number, up:number[], right:number[]}[],
 *   vertexValues:number[]|null, rotations:number[][], values:number[]
 * }}
 */
export function getPolyhedron(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const make = VERTEX_SETS[kind];
  if (!make) throw new Error(`Unsupported die: d${kind}`);
  const raw = make();
  const maxR = Math.max(...raw.map(v3.len));
  const vertices = raw.map(v => v3.scale(v, DIE_RADIUS[kind] / maxR));
  const faces = hullFaces(vertices);

  let vertexValues = null;
  if (kind === 2) {
    // Heads (1) on top, tails (2) underneath; the rim faces carry no value (0).
    for (const f of faces) f.value = f.normal[1] > 0.99 ? 1 : f.normal[1] < -0.99 ? 2 : 0;
  } else if (kind === 4) {
    vertexValues = vertices.map((v, i) => i + 1);
    faces.forEach((f, i) => (f.value = i + 1));
  } else {
    assignFaceValues(faces);
  }
  for (const f of faces) {
    f.up = faceUp(kind, f, vertices);
    f.right = v3.cross(f.up, f.normal);
  }
  const poly = {
    kind,
    radius: DIE_RADIUS[kind],
    vertices,
    faces,
    valueOn: kind === 4 ? "vertex" : "face",
    vertexValues,
    values: Array.from({ length: kind }, (_, i) => i + 1),
    rotations: rotationGroup(vertices)
  };
  cache.set(kind, poly);
  return poly;
}

/** Direction (in the die's local frame) of the element that shows `value`. */
export function valueDirection(poly, value) {
  if (poly.valueOn === "vertex") return v3.norm(poly.vertices[poly.vertexValues.indexOf(value)]);
  return poly.faces.find(f => f.value === value).normal;
}

/**
 * Which value is read on top, given the local-frame "up" direction
 * (the world up vector rotated into the die's frame).
 * @returns {{value:number, direction:number[], alignment:number}}
 */
export function readTop(poly, localUp) {
  const candidates = poly.valueOn === "vertex"
    ? poly.vertices.map((v, i) => ({ value: poly.vertexValues[i], direction: v3.norm(v) }))
    : poly.faces.filter(f => f.value > 0).map(f => ({ value: f.value, direction: f.normal }));
  let best = null;
  for (const c of candidates) {
    const alignment = v3.dot(c.direction, localUp);
    if (!best || alignment > best.alignment) best = { ...c, alignment };
  }
  return best;
}

/**
 * Pick a symmetry rotation R of the solid that moves the element showing
 * `desired` onto the element currently on top (`topDirection`). Applying R
 * to the rendered mesh (mesh = body * R) keeps the silhouette identical while
 * changing which number faces up.
 * @param {() => number} [random] Used to choose among equivalent rotations.
 */
export function remapRotation(poly, desired, topDirection, random = Math.random) {
  const from = valueDirection(poly, desired);
  const matches = poly.rotations.filter(R => v3.near(m3.mulVec(R, from), topDirection, 1e-3));
  if (!matches.length) throw new Error(`No symmetry maps value ${desired} to the top of d${poly.kind}`);
  return matches[Math.floor(random() * matches.length) % matches.length];
}
