import { woodGrain } from "./helpers.js";

/** Image 2, bottom row 3rd: oiled walnut grain, cream bone inlay pips. */
export default {
  id: "walnut",
  name: "Walnut",
  label: "SARGAS.Style.Walnut",
  body: {
    color: "#5b3a22",
    roughness: 0.5,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3,
    paint(p, rng, ctx) {
      woodGrain(p, rng, { light: "#76503a", dark: "#4a2d1b", frequency: 0.22, warp: 6, cells: ctx.cells });
    }
  },
  pips: { kind: "inlay", color: "#ede3c8", size: 0.17 },
  physics: { mass: 0.8, friction: 0.45, restitution: 0.3 },
  sound: "wood"
};
