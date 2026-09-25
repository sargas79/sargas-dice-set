import * as THREE from "three";
import { paintAtlas } from "./textures/faces.js";
import { getPolyhedron } from "./polyhedra.js";

/** Atlas cell size in px, by quality and die kind. */
const CELL_PX = {
  low: { 6: 192, other: 128 },
  medium: { 6: 320, other: 192 },
  high: { 6: 512, other: 256 }
};

const cache = new Map();

/**
 * Build (or fetch from cache) the material for one style + die kind.
 * Textures are painted lazily the first time a style is used, so styles
 * that are turned off never cost anything.
 */
export function getDieMaterial(style, kind, { quality = "medium", variant, anisotropy = 4 } = {}) {
  const key = `${style.id}|${kind}|${variant ?? ""}|${quality}`;
  if (cache.has(key)) return cache.get(key);
  const poly = getPolyhedron(kind);
  const cell = CELL_PX[quality]?.[kind === 6 ? 6 : "other"] ?? 256;
  const painter = paintAtlas(style, poly, cell, variant);

  const tex = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = anisotropy;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  const b = style.body;
  const transparent = (b.opacity ?? 1) < 1;
  const hasEmissive = !!(style.pips.emissive || b.emissive || style.emissive);
  const orm = tex(painter.ormCanvas(), false);

  const material = new THREE.MeshPhysicalMaterial({
    map: tex(painter.canvases.color, true),
    normalMap: tex(painter.normalCanvas(b.normalStrength ?? 2.5), false),
    normalScale: new THREE.Vector2(1, -1).multiplyScalar(b.normalScale ?? 1),
    roughness: 1,
    roughnessMap: orm,
    metalness: 1,
    metalnessMap: orm,
    aoMap: orm,
    aoMapIntensity: 0.6,
    clearcoat: b.clearcoat ?? 0,
    clearcoatRoughness: b.clearcoatRoughness ?? 0.1,
    envMapIntensity: b.envMapIntensity ?? 1,
    iridescence: b.iridescence ?? 0,
    iridescenceIOR: b.iridescenceIOR ?? 1.3,
    iridescenceThicknessRange: b.iridescenceThicknessRange ?? [100, 400],
    sheen: b.sheen ?? 0,
    sheenColor: new THREE.Color(b.sheenColor ?? "#ffffff"),
    specularIntensity: b.specularIntensity ?? 1,
    ior: b.ior ?? 1.5,
    transparent,
    depthWrite: !transparent,
    side: transparent ? THREE.DoubleSide : THREE.FrontSide
  });
  if (transparent) material.alphaMap = tex(painter.canvases.alpha, false);
  if (hasEmissive) {
    material.emissive = new THREE.Color("#ffffff");
    material.emissiveMap = tex(painter.canvases.emissive, true);
    material.emissiveIntensity = style.pips.emissiveIntensity ?? 1;
  }
  material.userData.painter = painter;
  // Face artwork still loading: use this material now, but build a fresh one next time.
  if (painter.complete !== false) cache.set(key, material);
  return material;
}

export function clearMaterialCache() {
  for (const m of cache.values()) {
    for (const k of ["map", "normalMap", "roughnessMap", "alphaMap", "emissiveMap"]) m[k]?.dispose();
    m.dispose();
  }
  cache.clear();
}
