import { Painter } from "../engine/textures/canvas.js";

export { Painter };
export * from "../engine/textures/patterns.js";

/** Scale a count to the atlas size so small and large atlases look the same density. */
export function perArea(p, countPer512) {
  return Math.round((countPer512 * p.width * p.height) / (512 * 512));
}

/** Half side of a d6 face (px). */
export function halfSide(face) {
  return Math.abs(face.polygon[0][0] - face.cx);
}

/** Which face gets a one-off decal: a chosen d6 face, or the highest face on other dice. */
export function decalFace(face, d6Value) {
  return face.kind === 6 ? face.value === d6Value : face.isMax;
}

/** Polygon path scaled toward the face centre. */
export function insetPath(face, k) {
  return ctx => {
    face.polygon.forEach(([x, y], i) => {
      const px = face.cx + (x - face.cx) * k, py = face.cy + (y - face.cy) * k;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
  };
}
