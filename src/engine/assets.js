/**
 * Where the module's own files (fonts) are served from: "modules/sargas-dice-set/"
 * inside Foundry, "../" on the preview page.
 */
let base = "";

export function setAssetBase(url) {
  base = url.endsWith("/") ? url : `${url}/`;
}

export function assetUrl(path) {
  return `${base}${path}`;
}
