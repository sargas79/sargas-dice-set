import { describe, it, expect } from "vitest";
import * as CANNON from "cannon-es";
import { simulateThrow, simulateThrowAsync, remapToResults } from "../src/engine/physics.js";
import { getPolyhedron, readTop } from "../src/engine/polyhedra.js";

function shownValues(dice, sim, remaps) {
  return dice.map((d, i) => {
    const f = sim.frames[i], o = (sim.frameCount - 1) * 7;
    const body = new CANNON.Quaternion(f[o + 3], f[o + 4], f[o + 5], f[o + 6]);
    const mesh = body.mult(new CANNON.Quaternion(...remaps[i]));
    const up = mesh.conjugate().vmult(new CANNON.Vec3(0, 1, 0));
    return readTop(getPolyhedron(d.kind), [up.x, up.y, up.z]).value;
  });
}

describe("physics", () => {
  it("is deterministic for a given seed", () => {
    const dice = [{ kind: 20 }, { kind: 6 }, { kind: 6 }];
    const a = simulateThrow({ dice, seed: "abc" });
    const b = simulateThrow({ dice, seed: "abc" });
    expect(a.frameCount).toBe(b.frameCount);
    a.frames.forEach((fr, i) => expect(Array.from(fr)).toEqual(Array.from(b.frames[i])));
  });

  it("the async simulation matches the synchronous one", async () => {
    const dice = [{ kind: 12 }, { kind: 4 }];
    const a = simulateThrow({ dice, seed: 42 });
    const b = await simulateThrowAsync({ dice, seed: 42 }, 1);
    expect(b.frameCount).toBe(a.frameCount);
    expect(Array.from(b.frames[0])).toEqual(Array.from(a.frames[0]));
  });

  it("keeps big rolls inside the tray and settles them", () => {
    const dice = Array.from({ length: 30 }, (_, i) => ({ kind: [6, 20, 8][i % 3] }));
    const sim = simulateThrow({ dice, seed: 3 });
    for (const fr of sim.frames) {
      const o = (sim.frameCount - 1) * 7;
      expect(Math.abs(fr[o])).toBeLessThan(11);
      expect(Math.abs(fr[o + 2])).toBeLessThan(6.2);
    }
    expect(sim.frameCount).toBeLessThan(8 * 60);
  });

  it("different seeds give different throws", () => {
    const a = simulateThrow({ dice: [{ kind: 6 }], seed: 1 });
    const b = simulateThrow({ dice: [{ kind: 6 }], seed: 2 });
    expect(Array.from(a.frames[0].slice(-7))).not.toEqual(Array.from(b.frames[0].slice(-7)));
  });

  it("always shows the rolled value (1,000+ dice)", { timeout: 60000 }, () => {
    const kinds = [4, 6, 8, 10, 12, 20];
    let checked = 0;
    for (let seed = 0; seed < 170; seed++) {
      const dice = kinds.map(kind => ({ kind }));
      const values = dice.map(d => 1 + ((seed * 7 + d.kind * 3) % d.kind));
      const sim = simulateThrow({ dice, seed });
      const remaps = remapToResults(dice, sim.tops, values, seed);
      expect(shownValues(dice, sim, remaps)).toEqual(values);
      checked += dice.length;
    }
    expect(checked).toBeGreaterThanOrEqual(1000);
  });

  it("dice settle flat on the table", () => {
    for (let seed = 0; seed < 30; seed++) {
      const sim = simulateThrow({ dice: [{ kind: 6 }, { kind: 20 }, { kind: 10 }], seed });
      for (const t of sim.tops) expect(t.alignment).toBeGreaterThan(0.95);
    }
  });

  it("keeps the physics result when no value is requested (hidden rolls)", () => {
    const dice = [{ kind: 6 }];
    const sim = simulateThrow({ dice, seed: 9 });
    expect(remapToResults(dice, sim.tops, [null], 9)).toEqual([[0, 0, 0, 1]]);
  });
});
