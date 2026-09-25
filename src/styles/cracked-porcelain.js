import { mottle, cracks, perArea } from "./helpers.js";

/** Image 1, bottom-right: glossy white porcelain with hairline cracks, cobalt-blue pips. */
export default {
  id: "cracked-porcelain",
  name: "Cracked Porcelain",
  label: "SARGAS.Style.CrackedPorcelain",
  body: {
    color: "#f3f1ec",
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    paint(p, rng) {
      mottle(p, rng, { scale: 0.01, amount: 0.03 });
      cracks(p, rng, { count: perArea(p, 5), color: "#7a766f", width: 1, length: p.width * 0.35, height: 0.3 });
    }
  },
  pips: { kind: "hole", color: "#2a66c9", roughness: 0.18, size: 0.17, rim: "#1c4c9c" },
  numerals: { kind: "paint", color: "#2a66c9", roughness: 0.2 },
  physics: { mass: 1.05, friction: 0.3, restitution: 0.42 },
  sound: "ceramic"
};
