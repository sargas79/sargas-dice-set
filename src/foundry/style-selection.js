/**
 * Pure helpers for the per-style on/off flags (no Foundry globals, so they
 * can be unit tested).
 */

/** A style is on unless the GM explicitly turned it off, so newly added styles start enabled. */
export function isStyleEnabled(enabledMap, id) {
  return enabledMap?.[id] !== false;
}

export function enabledStyles(allStyles, enabledMap) {
  return allStyles.filter(s => isStyleEnabled(enabledMap, s.id));
}

/**
 * The style a user's dice should use.
 * @returns {{style: object|null, fallback: boolean}}  style is null when every style is turned off.
 */
export function resolveStyle(requestedId, allStyles, enabledMap) {
  const available = enabledStyles(allStyles, enabledMap);
  const requested = available.find(s => s.id === requestedId);
  if (requested) return { style: requested, fallback: false };
  return { style: available[0] ?? null, fallback: !!requestedId && available.length > 0 };
}
