import { mottle, speckle, perArea } from "./helpers.js";

/** Image 2, top row 1st: translucent amber with a moth trapped inside, black pips. */
export default {
  id: "amber-moth",
  name: "Amber Moth",
  label: "SARGAS.Style.AmberMoth",
  body: {
    color: "#e38d0c",
    opacity: 0.66,
    roughness: 0.07,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    ior: 1.54,
    envMapIntensity: 1.2,
    paint(p, rng) {
      mottle(p, rng, { scale: 0.008, amount: 0.16, tint: "#ffbe45" });
      speckle(p, rng, { count: perArea(p, 60), color: "#ffe0a0", size: [0.8, 2.2], height: 0, opacity: 0.35 });
    }
  },
  pips: { kind: "hole", color: "#140d06", size: 0.18 },
  inclusion: "moth",
  physics: { mass: 0.85, friction: 0.32, restitution: 0.38 },
  sound: "resin"
};
