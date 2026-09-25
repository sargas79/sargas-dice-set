/**
 * Dice style registry. A style is plain data plus optional drawing hooks:
 *
 * {
 *   id, label (i18n key), name (fallback text), description,
 *   body:   { color, roughness, metalness, opacity, clearcoat, iridescence, ior, paint(painter, rng, ctx) },
 *   pips:   { kind: "hole"|"cup"|"enamel"|"paint"|"inlay"|"glow", color, size, emissive, worn },
 *   numerals?: same shape as pips, used for d4/d8/d10/d12/d20,
 *   decorateFace?(painter, face, rng), overlayFace?(painter, face, rng), drawPip?(painter, x, y, r, face, i, rng),
 *   inclusion?: "note"|"moth",
 *   shape?: "rounded"   (casino-style d6 with sphere-cut corners),
 *   size?: number       (dice size relative to the standard set, 0.4-1.5),
 *   collection?: string (groups styles in the menu, e.g. "sargas", "classic"),
 *   physics: { mass, friction, restitution },
 *   sound: "bone"|"wood"|"glass"|"metal"|"stone"|"ceramic"|"resin"
 * }
 */

const styles = new Map();

const PIP_KINDS = ["hole", "cup", "enamel", "paint", "inlay", "glow"];
const SOUNDS = ["bone", "wood", "glass", "metal", "stone", "ceramic", "resin"];

export function validateStyle(def) {
  const errors = [];
  if (!def?.id || !/^[a-z0-9-]+$/.test(def.id)) errors.push("id must be kebab-case");
  if (!def?.name) errors.push("name is required");
  if (!def?.body?.color) errors.push("body.color is required");
  if (!def?.pips?.color) errors.push("pips.color is required");
  if (!PIP_KINDS.includes(def?.pips?.kind)) errors.push(`pips.kind must be one of ${PIP_KINDS.join(", ")}`);
  if (!SOUNDS.includes(def?.sound)) errors.push(`sound must be one of ${SOUNDS.join(", ")}`);
  if (def?.shape !== undefined && def.shape !== "rounded") errors.push('shape must be "rounded" or left out');
  if (def?.size !== undefined && !(def.size >= 0.4 && def.size <= 1.5)) errors.push("size must be between 0.4 and 1.5");
  return errors;
}

export function registerStyle(def) {
  const errors = validateStyle(def);
  if (errors.length) throw new Error(`Invalid dice style "${def?.id}": ${errors.join("; ")}`);
  styles.set(def.id, Object.freeze({ physics: { mass: 1, friction: 0.35, restitution: 0.35 }, ...def }));
  return styles.get(def.id);
}

export function getStyle(id) {
  return styles.get(id) ?? null;
}

/** All styles in registration order. */
export function getStyles() {
  return [...styles.values()];
}
