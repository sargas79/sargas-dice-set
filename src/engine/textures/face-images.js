import { assetUrl } from "../assets.js";

/**
 * Styles can supply ready-made artwork for d6 faces as SVG (`faceSvg(value)`),
 * e.g. the Oracle finishes, whose faces come straight from their design.
 * Browsers only rasterise SVG asynchronously, so the images are loaded once,
 * up front (preloadStyles), and then drawn synchronously into the atlas.
 */

const SIZE = 512;
const images = new Map();
const pending = new Map();

const key = (style, value) => `${style.id}:${value}`;

function loadImage(svg) {
  const img = new Image();
  img.decoding = "async";
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return img.decode().then(() => img);
}

const fonts = new Map();

/** Load a font file shipped with the module so canvas text can use it. */
function loadFont({ family, weight = 400, file }) {
  if (typeof FontFace === "undefined" || typeof document === "undefined") return Promise.resolve();
  const id = `${family}:${weight}`;
  if (!fonts.has(id)) {
    const face = new FontFace(family, `url(${assetUrl(file)})`, { weight: String(weight) });
    fonts.set(id, face.load().then(loaded => document.fonts.add(loaded)).catch(err => {
      fonts.delete(id);
      console.warn(`Sargas Dice | could not load font ${family}`, err);
    }));
  }
  return fonts.get(id);
}

/** Load a style's face images and fonts (no-op for styles without them). */
export function preloadStyle(style) {
  if ((!style?.faceSvg && !style?.fonts) || typeof Image === "undefined") return Promise.resolve();
  if (pending.has(style.id)) return pending.get(style.id);
  const job = Promise.all([
    ...(style.fonts ?? []).map(loadFont),
    ...(style.faceSvg ? [1, 2, 3, 4, 5, 6] : []).map(value =>
      loadImage(style.faceSvg(value, SIZE)).then(img => images.set(key(style, value), img))
    )
  ]).catch(err => {
    pending.delete(style.id);
    console.warn(`Sargas Dice | could not load face artwork for ${style.id}`, err);
  });
  pending.set(style.id, job);
  return job;
}

export function preloadStyles(styles) {
  return Promise.all([...new Set(styles)].map(preloadStyle));
}

/** The loaded image for a d6 face value, or null (not loaded yet, or the style has none). */
export function faceImage(style, value) {
  return images.get(key(style, value)) ?? null;
}

/** False while a style that has face artwork is still loading it. */
export function faceImagesReady(style) {
  if (!style?.faceSvg) return true;
  return [1, 2, 3, 4, 5, 6].every(v => images.has(key(style, v)));
}
