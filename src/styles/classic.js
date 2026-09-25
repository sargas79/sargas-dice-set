import { mottle } from "./helpers.js";

/**
 * "Classic" collection: small casino-style acrylic d6s with sphere-cut rounded
 * corners and big white pips, in the colours of the reference photos. The
 * darker colours are slightly translucent, like cast acrylic.
 */
const SETS = [
  { id: "pink", name: "Classic Pink", color: "#de5591" },
  { id: "sky", name: "Classic Sky Blue", color: "#0c7cc0" },
  { id: "orange", name: "Classic Orange", color: "#e5740a" },
  { id: "brown", name: "Classic Brown", color: "#4b2a25", translucent: true },
  { id: "green", name: "Classic Green", color: "#1e7a2b", translucent: true },
  { id: "blue", name: "Classic Blue", color: "#1c2f9e", translucent: true },
  { id: "red", name: "Classic Red", color: "#c4121f", translucent: true },
  { id: "purple", name: "Classic Purple", color: "#5a2a8f", translucent: true }
];

function classicStyle({ id, name, color, translucent = false }) {
  const key = id.charAt(0).toUpperCase() + id.slice(1);
  return {
    id: `classic-${id}`,
    name,
    label: `SARGAS.Style.Classic${key}`,
    collection: "classic",
    shape: "rounded",
    size: 0.78,
    body: {
      color,
      roughness: 0.3,
      clearcoat: 0.45,
      clearcoatRoughness: 0.18,
      envMapIntensity: 0.7,
      ...(translucent ? { opacity: 0.95, ior: 1.49 } : {}),
      paint(p, rng) {
        mottle(p, rng, { scale: 0.01, amount: 0.03 });
      }
    },
    pips: { kind: "paint", color: "#fbf8f6", size: 0.21, spacing: 0.56, roughness: 0.35 },
    physics: { mass: 0.7, friction: 0.3, restitution: 0.4 },
    sound: "resin"
  };
}

export const CLASSIC_STYLES = SETS.map(classicStyle);
