import { brushed, Painter, halfSide } from "./helpers.js";
import { drawPip } from "../engine/textures/faces.js";

/** Image 1, bottom-left: brushed steel, rivets along every edge, yellow enamel pips. */
export default {
  id: "riveted-steel",
  name: "Riveted Steel",
  label: "SARGAS.Style.RivetedSteel",
  body: {
    color: "#c4c6c8",
    metalness: 1,
    roughness: 0.32,
    envMapIntensity: 1.8,
    paint(p, rng) {
      brushed(p, rng, { amount: 0.08 });
    }
  },
  pips: { kind: "enamel", color: "#f2c318", size: 0.18 },
  numerals: { kind: "enamel", color: "#f2c318" },
  decorateFace(p, face) {
    // Domed rivets inset along each edge.
    const poly = face.polygon.map(([x, y]) => [face.cx + (x - face.cx) * 0.9, face.cy + (y - face.cy) * 0.9]);
    const r = face.unit * 0.032;
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(2, Math.round(len / (r * 5)));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        p.disc(x, y, r * 1.25, { color: "rgba(40,40,40,0.5)", height: 0.45 });
        p.disc(x, y, r, {
          color: Painter.radial(x - r * 0.3, y - r * 0.3, r * 1.3, [[0, "#e6e8ea"], [0.6, "#a4a6a8"], [1, "#5d5f61"]]),
          height: Painter.radial(x, y, r, [[0, 0.95], [1, 0.55]]),
          metal: 1,
          rough: 0.3
        });
      }
    }
  },
  drawPip(p, x, y, r, face, i) {
    // The 6 face shows bare drilled holes, as in the mockup.
    if (face.value === 6) {
      drawPip(p, x, y, r, { kind: "hole", color: "#2b2c2d", roughness: 0.6 });
      return;
    }
    drawPip(p, x, y, r, this.pips);
    // Tiny stamped maker's mark inside the enamel.
    p.apply({ color: "rgba(90,60,0,0.55)" }, ctx => {
      ctx.font = `bold ${Math.round(r * 0.55)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", x, y);
    });
  },
  physics: { mass: 1.8, friction: 0.3, restitution: 0.25 },
  sound: "metal"
};
