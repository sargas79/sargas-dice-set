import { makeNoise, pixelPass } from "./helpers.js";

/** HSL (0-1) to RGB (0-255). */
function hsl(h, s, l) {
  const f = n => {
    const k = (n + h * 12) % 12;
    return 255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

/** Image 2, bottom row 4th: glossy black with an iridescent oil-slick sheen, glowing magenta pips. */
export default {
  id: "oil-slick",
  name: "Oil Slick",
  label: "SARGAS.Style.OilSlick",
  body: {
    color: "#0b0b0d",
    roughness: 0.12,
    metalness: 0.65,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 1,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 800],
    envMapIntensity: 2.4,
    paint(p, rng) {
      // Swirling thin-film colours baked into the base so the sheen shows even under flat lighting.
      const noise = makeNoise(rng);
      pixelPass(p, (x, y, px) => {
        const n = noise.fbm(x * 0.005, y * 0.005, 4);
        const band = noise.fbm(x * 0.012 + 40, y * 0.012, 3);
        const [r, g, b] = hsl((n * 2.2) % 1, 0.75, 0.05 + band * 0.16);
        px.r = r;
        px.g = g;
        px.b = b;
      });
    }
  },
  pips: { kind: "glow", color: "#ff3fb4", emissive: "#ff3fb4", emissiveIntensity: 0.8, size: 0.17 },
  physics: { mass: 1, friction: 0.3, restitution: 0.38 },
  sound: "resin"
};
