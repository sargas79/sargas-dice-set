import { mottle, sparkles, perArea } from "./helpers.js";

/** Image 2, top row 2nd: frosted ice glass with glitter, deep royal-blue pips. */
export default {
  id: "frost",
  name: "Frost",
  label: "SARGAS.Style.Frost",
  body: {
    color: "#e4ebf3",
    opacity: 0.8,
    roughness: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
    emissive: true,
    paint(p, rng) {
      mottle(p, rng, { scale: 0.02, amount: 0.06, height: 0.03 });
      sparkles(p, rng, { count: perArea(p, 260), glow: "#6f86c8", size: [0.4, 1.1] });
    }
  },
  pips: { kind: "hole", color: "#1d3fa8", roughness: 0.15, size: 0.17, rim: "#142d7a" },
  numerals: { kind: "paint", color: "#1d3fa8", roughness: 0.15 },
  physics: { mass: 1.1, friction: 0.25, restitution: 0.4 },
  sound: "glass"
};
