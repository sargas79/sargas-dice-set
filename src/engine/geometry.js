import * as THREE from "three";
import { v3 } from "./polyhedra.js";
import { getLayout } from "./layout.js";

const geometryCache = new Map();

/**
 * Chamfered die mesh: flat faces shrunk toward their centres, joined by edge
 * strips and corner fans whose vertex normals blend between neighbouring
 * faces, which shades as a rounded edge. UVs point into the face atlas.
 */
export function getDieGeometry(poly) {
  if (geometryCache.has(poly.kind)) return geometryCache.get(poly.kind);
  const layout = getLayout(poly);
  const k = layout.chamfer;
  const pos = [], nor = [], uv = [];

  // Shrunk copy of each vertex, per face.
  const shrunk = poly.faces.map(f => {
    const map = new Map();
    for (const vi of f.verts) map.set(vi, v3.lerp(f.center, poly.vertices[vi], k));
    return map;
  });

  const bodyUV = p => {
    // Planar projection into the body cell; body texture is uniform enough that seams don't show.
    const s = 0.5 * (p[0] + p[2] * 0.6) / poly.radius;
    const t = 0.5 * (p[1] + p[2] * 0.4) / poly.radius;
    return layout.toAtlas(layout.bodyCell, s * layout.extent, t * layout.extent);
  };
  const push = (p, n, st) => {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);
    uv.push(st[0], 1 - st[1]);
  };
  /** Push a triangle, flipping winding if it faces inward. */
  const tri = (a, b, c) => {
    const n = v3.cross(v3.sub(b.p, a.p), v3.sub(c.p, a.p));
    const mid = v3.scale(v3.add(v3.add(a.p, b.p), c.p), 1 / 3);
    if (v3.dot(n, mid) < 0) [b, c] = [c, b];
    for (const v of [a, b, c]) push(v.p, v.n, v.uv);
  };

  // Faces.
  poly.faces.forEach((f, fi) => {
    const lf = layout.faces[fi];
    const centre = { p: f.center, n: f.normal, uv: layout.toAtlas(lf.cell, 0, 0) };
    const ring = f.verts.map((vi, j) => ({
      p: shrunk[fi].get(vi),
      n: f.normal,
      uv: layout.toAtlas(lf.cell, lf.points[j][0] * k, lf.points[j][1] * k)
    }));
    for (let j = 0; j < ring.length; j++) tri(centre, ring[j], ring[(j + 1) % ring.length]);
  });

  // Edge strips.
  const seen = new Set();
  poly.faces.forEach((f, fi) => {
    f.verts.forEach((a, j) => {
      const b = f.verts[(j + 1) % f.verts.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) return;
      seen.add(key);
      const gi = poly.faces.findIndex((g, i) => i !== fi && g.verts.includes(a) && g.verts.includes(b));
      const g = poly.faces[gi];
      const mk = (face, idx, vi) => {
        const p = shrunk[idx].get(vi);
        return { p, n: face.normal, uv: bodyUV(p) };
      };
      const fa = mk(f, fi, a), fb = mk(f, fi, b), ga = mk(g, gi, a), gb = mk(g, gi, b);
      tri(fa, fb, gb);
      tri(fa, gb, ga);
    });
  });

  // Corner fans.
  poly.vertices.forEach((v, vi) => {
    const axis = v3.norm(v);
    const around = poly.faces
      .map((f, fi) => (f.verts.includes(vi) ? { p: shrunk[fi].get(vi), n: f.normal } : null))
      .filter(Boolean);
    const ref = v3.norm(v3.sub(around[0].p, v3.scale(axis, v3.dot(around[0].p, axis))));
    const ref2 = v3.cross(axis, ref);
    const ang = p => Math.atan2(v3.dot(p, ref2), v3.dot(p, ref));
    around.sort((a, b) => ang(a.p) - ang(b.p));
    const c = v3.scale(around.reduce((acc, x) => v3.add(acc, x.p), [0, 0, 0]), 1 / around.length);
    const centre = { p: c, n: axis, uv: bodyUV(c) };
    for (const a of around) a.uv = bodyUV(a.p);
    for (let j = 0; j < around.length; j++) tri(centre, around[j], around[(j + 1) % around.length]);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeBoundingSphere();
  geometryCache.set(poly.kind, geometry);
  return geometry;
}

/** Corner/edge rounding radius of "rounded" d6s, relative to half the cube's side. */
export const ROUNDED_RADIUS = 0.42;
const ROUNDED_GRID = 32;

/**
 * Casino-style d6: a cube with smoothly rounded edges and corners (a rounded
 * box: every surface point is the nearest point of a smaller inner box pushed
 * out by the rounding radius). Each face is a grid that keeps its own atlas
 * cell, so pips and textures line up with the chamfered d6.
 */
export function getRoundedCubeGeometry(poly, roundness = ROUNDED_RADIUS) {
  const key = `rounded:${poly.kind}:${roundness}`;
  if (geometryCache.has(key)) return geometryCache.get(key);
  if (poly.kind !== 6) throw new Error("Rounded geometry is only defined for d6");
  const layout = getLayout(poly);
  const half = v3.len(poly.faces[0].center);
  const r = half * roundness;
  const inner = half - r;
  const clamp = v => Math.max(-inner, Math.min(inner, v));
  const N = ROUNDED_GRID;
  const pos = [], nor = [], uv = [], index = [];

  poly.faces.forEach((f, fi) => {
    const cell = layout.faces[fi].cell;
    const base = pos.length / 3;
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const x = -half + (2 * half * i) / N, y = -half + (2 * half * j) / N;
        const p = v3.add(v3.add(f.center, v3.scale(f.right, x)), v3.scale(f.up, y));
        const q = p.map(clamp);
        const n = v3.norm(v3.sub(p, q));
        pos.push(...v3.add(q, v3.scale(n, r)));
        nor.push(...n);
        const [s, t] = layout.toAtlas(cell, x, y);
        uv.push(s, 1 - t);
      }
    }
    // (x along right, y along up) winds counter-clockwise around the outward normal.
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = base + j * (N + 1) + i, b = a + 1, c = a + N + 2, d = a + N + 1;
        index.push(a, b, c, a, c, d);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  geometryCache.set(key, geometry);
  return geometry;
}

/** The mesh a style uses for a die kind (styles with shape "rounded" get rounded d6s; `roundness` sets the corner radius). */
export function getStyleGeometry(poly, style) {
  return style?.shape === "rounded" && poly.kind === 6 ? getRoundedCubeGeometry(poly, style.roundness ?? ROUNDED_RADIUS) : getDieGeometry(poly);
}
