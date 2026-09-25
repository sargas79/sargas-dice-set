/**
 * Multi-layer canvas painter. Every die atlas is painted into parallel
 * layers (colour, height, roughness, metalness, alpha, emissive) so a single
 * drawing call such as "a recessed brass pip" updates all of them at once.
 */

export function createCanvas(w, h) {
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }
  return new OffscreenCanvas(w, h);
}

const gray = v => {
  const n = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgb(${n},${n},${n})`;
};

export const LAYERS = ["color", "height", "rough", "metal", "alpha", "emissive"];

/**
 * A "surface" says what to write into each layer; undefined keys are left alone.
 * @typedef {{color?:string|CanvasGradient, height?:number|((ctx)=>CanvasGradient), rough?:number, metal?:number, alpha?:number, emissive?:string}} Surface
 */

export class Painter {
  constructor(width, height, base) {
    this.width = width;
    this.height = height;
    this.canvases = {};
    this.ctx = {};
    for (const name of LAYERS) {
      const c = createCanvas(width, height);
      this.canvases[name] = c;
      this.ctx[name] = c.getContext("2d", { willReadFrequently: name === "height" || name === "rough" || name === "metal" });
    }
    this.fillRect(0, 0, width, height, {
      color: base.color,
      height: 0.5,
      rough: base.rough ?? 0.5,
      metal: base.metal ?? 0,
      alpha: base.alpha ?? 1,
      emissive: "#000"
    });
  }

  /** Run `draw(ctx, layerName)` on each layer named in `surface`, with that layer's fill style set. */
  apply(surface, draw) {
    for (const name of LAYERS) {
      let v = surface[name];
      if (v === undefined || v === null) continue;
      const ctx = this.ctx[name];
      ctx.save();
      if (typeof v === "function") v = v(ctx, name);
      else if (typeof v === "number") v = gray(v);
      ctx.fillStyle = v;
      ctx.strokeStyle = v;
      if (surface.opacity !== undefined) ctx.globalAlpha = surface.opacity;
      if (surface.blend && name === "color") ctx.globalCompositeOperation = surface.blend;
      draw(ctx, name);
      ctx.restore();
    }
  }

  fillRect(x, y, w, h, surface) {
    this.apply(surface, ctx => ctx.fillRect(x, y, w, h));
  }

  fillPath(path, surface) {
    this.apply(surface, ctx => {
      ctx.beginPath();
      path(ctx);
      ctx.fill();
    });
  }

  strokePath(path, width, surface) {
    this.apply(surface, ctx => {
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      path(ctx);
      ctx.stroke();
    });
  }

  disc(x, y, r, surface) {
    this.fillPath(ctx => ctx.arc(x, y, r, 0, Math.PI * 2), surface);
  }

  /** Radial gradient helper usable as a Surface value. */
  static radial(x, y, r, stops) {
    return ctx => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      for (const [t, c] of stops) g.addColorStop(t, typeof c === "number" ? gray(c) : c);
      return g;
    };
  }

  /** Run a callback with every layer clipped to a path. */
  clip(path, fn) {
    for (const name of LAYERS) {
      const ctx = this.ctx[name];
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
    }
    try {
      fn();
    } finally {
      for (const name of LAYERS) this.ctx[name].restore();
    }
  }

  /** Apply a transform to every layer for the duration of `fn`. */
  transform(x, y, rot, fn) {
    for (const name of LAYERS) {
      const ctx = this.ctx[name];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
    }
    try {
      fn();
    } finally {
      for (const name of LAYERS) this.ctx[name].restore();
    }
  }

  /** Normal map from the height layer (Sobel filter). */
  normalCanvas(strength = 2) {
    const { width: w, height: h } = this;
    const src = this.ctx.height.getImageData(0, 0, w, h).data;
    const out = createCanvas(w, h);
    const octx = out.getContext("2d");
    const img = octx.createImageData(w, h);
    const d = img.data;
    const H = (x, y) => src[((Math.min(h - 1, Math.max(0, y)) * w) + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
        const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
        let nx = -dx * strength, ny = dy * strength, nz = 1;
        const l = Math.hypot(nx, ny, nz);
        const i = (y * w + x) * 4;
        d[i] = ((nx / l) * 0.5 + 0.5) * 255;
        d[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
        d[i + 2] = ((nz / l) * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return out;
  }

  /** glTF-style ORM map: R = occlusion (from height cavities), G = roughness, B = metalness. */
  ormCanvas() {
    const { width: w, height: h } = this;
    const rough = this.ctx.rough.getImageData(0, 0, w, h).data;
    const metal = this.ctx.metal.getImageData(0, 0, w, h).data;
    const height = this.ctx.height.getImageData(0, 0, w, h).data;
    const out = createCanvas(w, h);
    const octx = out.getContext("2d");
    const img = octx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, 150 + height[i] * 0.9);
      d[i + 1] = rough[i];
      d[i + 2] = metal[i];
      d[i + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    return out;
  }
}
