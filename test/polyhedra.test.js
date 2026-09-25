import { describe, it, expect } from "vitest";
import { getPolyhedron, remapRotation, readTop, valueDirection, m3, v3 } from "../src/engine/polyhedra.js";

const KINDS = { 4: { faces: 4, group: 12 }, 6: { faces: 6, group: 24 }, 8: { faces: 8, group: 24 }, 10: { faces: 10, group: 10 }, 12: { faces: 12, group: 60 }, 20: { faces: 20, group: 60 } };

describe("polyhedra", () => {
  for (const [kind, spec] of Object.entries(KINDS).map(([k, v]) => [Number(k), v])) {
    describe(`d${kind}`, () => {
      const poly = getPolyhedron(kind);

      it("has the right faces and a full rotation group", () => {
        expect(poly.faces).toHaveLength(spec.faces);
        expect(poly.rotations).toHaveLength(spec.group);
      });

      it("uses each value exactly once", () => {
        const values = kind === 4 ? [...poly.vertexValues] : poly.faces.map(f => f.value);
        expect(values.sort((a, b) => a - b)).toEqual(Array.from({ length: kind }, (_, i) => i + 1));
      });

      if (kind !== 4) {
        it(`opposite faces sum to ${kind + 1}`, () => {
          for (const f of poly.faces) {
            const opp = poly.faces.find(g => v3.near(g.normal, v3.scale(f.normal, -1), 1e-3));
            expect(f.value + opp.value).toBe(kind + 1);
          }
        });
      }

      it("can put any value on top of any resting position", () => {
        const tops = kind === 4 ? poly.vertices.map(v => v3.norm(v)) : poly.faces.map(f => f.normal);
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
