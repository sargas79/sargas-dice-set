import { mottle, pits, scratches, speckle, perArea } from "./helpers.js";

/** Image 2, bottom row 1st: grey cast concrete with pitting and tool marks, orange pips. */
export default {
  id: "concrete",
  name: "Concrete",
  label: "SARGAS.Style.Concrete",
  body: {
    color: "#8e8d88",
    roughness: 0.92,
    normalStrength: 3,
    paint(p, rng) {
      mottle(p, rng, { scale: 0.03, amount: 0.16, height: 0.12, rough: 0.05 });
      speckle(p, rng, { count: perArea(p, 1200), color: "#5d5c58", size: [0.3, 1], opacity: 0.5, height: -0.05 });
      pits(p, rng, { count: perArea(p, 70), size: [1, 3.2], color: "#4a4945" });
      scratches(p, rng, { count: perArea(p, 10), color: "#3d3c39", length: [10, 28], width: 2, opacity: 0.7 });
    }
  },
  pips: { kind: "paint", color: "#f26a1b", size: 0.17, roughness: 0.7 },
  physics: { mass: 1.4, friction: 0.5, restitution: 0.18 },
  sound: "stone"
};
