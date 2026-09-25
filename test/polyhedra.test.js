import { describe, it, expect } from "vitest";
import { getPolyhedron, remapRotation, readTop, valueDirection, m3, v3 } from "../src/engine/polyhedra.js";

const KINDS = { 2: { faces: 18, group: 32 }, 4: { faces: 4, group: 12 }, 6: { faces: 6, group: 24 }, 8: { faces: 8, group: 24 }, 10: { faces: 10, group: 10 }, 12: { faces: 12, group: 60 }, 20: { faces: 20, group: 60 } };

describe("polyhedra", () => {
  for (const [kind, spec] of Object.entries(KINDS).map(([k, v]) => [Number(k), v])) {
    describe(`d${kind}`, () => {
      const poly = getPolyhedron(kind);

      it("has the right faces and a full rotation group", () => {
        expect(poly.faces).toHaveLength(spec.faces);
        expect(poly.rotations).toHaveLength(spec.group);
      });

      it("uses each value exactly once", () => {
        const values = kind === 4 ? [...poly.vertexValues] : poly.faces.map(f => f.value).filter(v => v > 0);
        expect(values.sort((a, b) => a - b)).toEqual(Array.from({ length: kind }, (_, i) => i + 1));
      });

      if (kind !== 4 && kind !== 2) {
        it(`opposite faces sum to ${kind + 1}`, () => {
          for (const f of poly.faces) {
            const opp = poly.faces.find(g => v3.near(g.normal, v3.scale(f.normal, -1), 1e-3));
            expect(f.value + opp.value).toBe(kind + 1);
          }
        });
      }

      it("can put any value on top of any resting position", () => {
        const tops = kind === 4 ? poly.vertices.map(v => v3.norm(v)) : poly.faces.filter(f => f.value > 0).map(f => f.normal);
        for (const top of tops) {
          for (const value of poly.values) {
            const R = remapRotation(poly, value, top);
            // Mesh = body * R, so the die's local "up" in mesh space is R^T * top.
            const localUp = m3.mulVec(m3.transpose(R), top);
            expect(readTop(poly, localUp).value).toBe(value);
          }
        }
      });

      it("reads the value whose direction points up", () => {
        for (const value of poly.values) expect(readTop(poly, valueDirection(poly, value)).value).toBe(value);
      });
    });
  }
});

describe("rounded d6 geometry", async () => {
  const { getRoundedCubeGeometry, ROUNDED_RADIUS } = await import("../src/engine/geometry.js");
  const poly = getPolyhedron(6);
  const geo = getRoundedCubeGeometry(poly);
  const pos = geo.getAttribute("position"), nor = geo.getAttribute("normal");
  const half = v3.len(poly.faces[0].center);

  it("stays inside the cube and keeps flat face centres", () => {
    let maxAbs = 0;
    for (let i = 0; i < pos.count; i++) maxAbs = Math.max(maxAbs, Math.abs(pos.getX(i)), Math.abs(pos.getY(i)), Math.abs(pos.getZ(i)));
    expect(maxAbs).toBeCloseTo(half, 5);
  });

  it("rounds the corners with the rounding radius", () => {
    const inner = half * (1 - ROUNDED_RADIUS);
    const corner = Math.sqrt(3) * inner + half * ROUNDED_RADIUS;
    let maxR = 0;
    for (let i = 0; i < pos.count; i++) maxR = Math.max(maxR, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)));
    expect(maxR).toBeCloseTo(corner, 3);
    expect(maxR).toBeLessThan(poly.radius);
  });

  it("has unit normals pointing outward", () => {
    for (let i = 0; i < pos.count; i += 7) {
      const n = [nor.getX(i), nor.getY(i), nor.getZ(i)];
      expect(v3.len(n)).toBeCloseTo(1, 5);
      expect(v3.dot(n, [pos.getX(i), pos.getY(i), pos.getZ(i)])).toBeGreaterThan(0);
    }
  });
});
