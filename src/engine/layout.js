import { v3 } from "./polyhedra.js";

/** Fraction of each atlas cell used by the face (the rest is bleed margin). */
const CELL_FIT = 0.9;

/** Chamfer factor: how far faces are shrunk toward their centre to make rounded edges. */
export const CHAMFER = { 2: 0.93, 4: 0.86, 6: 0.88, 8: 0.87, 10: 0.86, 12: 0.9, 20: 0.88 };

/**
 * Texture atlas layout shared by the geometry builder (UVs) and the face
 * painter (canvas drawing), so both agree on where each face lives.
 * Cell i holds face i; the last cell holds plain body texture for edges.
 */
export function getLayout(poly) {
  if (poly._layout) return poly._layout;
  const chamfer = CHAMFER[poly.kind];
  const count = poly.faces.length + 1;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const faces = poly.faces.map((f, i) => {
    const points = f.verts.map(vi => {
      const d = v3.sub(poly.vertices[vi], f.center);
      return [v3.dot(d, f.right), v3.dot(d, f.up)];
    });
    return { index: i, value: f.value, points, cell: i, verts: f.verts };
  });
  // Largest half-extent over all faces, so every face uses the same scale.
  let extent = 0;
  for (const f of faces) for (const [x, y] of f.points) extent = Math.max(extent, Math.abs(x), Math.abs(y));

  const layout = {
    kind: poly.kind,
    chamfer,
    cols,
    rows,
    extent,
    fit: CELL_FIT,
    bodyCell: poly.faces.length,
    faces,
    /** Cell origin (column, row) for a cell index. */
    cellOrigin: cell => [cell % cols, Math.floor(cell / cols)],
    /** Face-local 2D point -> normalised atlas coordinates (s right, t down). */
    toAtlas(cell, x, y) {
      const [c, r] = this.cellOrigin(cell);
      return [(c + 0.5 + (x / (2 * extent)) * CELL_FIT) / cols, (r + 0.5 - (y / (2 * extent)) * CELL_FIT) / rows];
    }
  };
  poly._layout = layout;
  return layout;
}
