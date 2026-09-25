import * as THREE from "three";
import { createCanvas } from "./textures/canvas.js";
import { createRng } from "./rng.js";
import { v3 } from "./polyhedra.js";

/**
 * Objects sealed inside see-through dice (the folded note in Smoke Glass,
 * the moth in Amber). Drawn as opaque meshes so they render before the
 * transparent body.
 */

const textureCache = new Map();

function noteTexture() {
  if (textureCache.has("note")) return textureCache.get("note");
  const c = createCanvas(256, 256);
  const ctx = c.getContext("2d");
  const rng = createRng("note");
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, "#d9c7a4");
  g.addColorStop(1, "#b9a27a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // Ink scribbles in rows, like handwriting.
  ctx.strokeStyle = "rgba(60,40,25,0.75)";
  ctx.lineWidth = 2;
  for (let row = 0; row < 7; row++) {
    const y = 40 + row * 28;
    ctx.beginPath();
    let x = 24;
    ctx.moveTo(x, y);
    while (x < 232 - rng.range(0, 60) * (row === 6 ? 2 : 0.3)) {
      x += rng.range(3, 7);
      ctx.lineTo(x, y + rng.range(-5, 5));
    }
    ctx.stroke();
  }
  // Fold crease.
  ctx.strokeStyle = "rgba(90,70,40,0.4)";
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set("note", t);
  return t;
}

function mothTexture() {
  if (textureCache.has("moth")) return textureCache.get("moth");
  const c = createCanvas(256, 256);
  const ctx = c.getContext("2d");
  const rng = createRng("moth");
  ctx.translate(128, 128);
  const wing = (dir, upper) => {
    ctx.save();
    ctx.scale(dir, 1);
    ctx.beginPath();
    if (upper) {
      ctx.moveTo(4, -6);
      ctx.bezierCurveTo(40, -70, 110, -60, 112, -30);
      ctx.bezierCurveTo(100, 0, 40, 10, 4, 6);
    } else {
      ctx.moveTo(4, 4);
      ctx.bezierCurveTo(50, 10, 90, 40, 70, 70);
      ctx.bezierCurveTo(40, 80, 10, 40, 2, 14);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -60, 100, 60);
    g.addColorStop(0, "#6b4a2b");
    g.addColorStop(0.5, "#8a6a45");
    g.addColorStop(1, "#4a3220");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    // Wing veins and speckles.
    ctx.strokeStyle = "rgba(40,25,12,0.6)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.quadraticCurveTo(50, (upper ? -30 : 30) + i * 6, 110, (upper ? -60 : 60) + i * 18 * (upper ? 1 : -1));
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${rng.next() < 0.5 ? "30,18,8" : "200,170,120"},${rng.range(0.2, 0.6)})`;
      ctx.beginPath();
      ctx.arc(rng.range(10, 100), rng.range(upper ? -60 : 5, upper ? 5 : 70), rng.range(1, 3), 0, 7);
      ctx.fill();
    }
    ctx.restore();
  };
  wing(1, true);
  wing(-1, true);
  wing(1, false);
  wing(-1, false);
  // Body and antennae.
  ctx.fillStyle = "#3b2715";
  ctx.beginPath();
  ctx.ellipse(0, 8, 7, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3b2715";
  ctx.lineWidth = 1.5;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.quadraticCurveTo(s * 18, -60, s * 30, -70);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set("moth", t);
  return t;
}

/** Radius of the largest sphere that fits inside the die. */
function innerRadius(poly) {
  return Math.min(...poly.faces.map(f => v3.dot(f.center, f.normal)));
}

export function createInclusion(type, poly) {
  if (!type) return null;
  const r = innerRadius(poly) * 0.72;
  const group = new THREE.Group();
  if (type === "note") {
    const mat = new THREE.MeshStandardMaterial({ map: noteTexture(), roughness: 0.9, side: THREE.DoubleSide });
    const w = r * 1.1, h = r * 1.3;
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(w, h);
      g.translate((s * w) / 2, 0, 0);
      const m = new THREE.Mesh(g, mat);
      m.rotation.y = s * 0.45;
      group.add(m);
    }
    group.rotation.set(0.5, 0.3, 0.2);
  } else if (type === "moth") {
    const mat = new THREE.MeshStandardMaterial({ map: mothTexture(), roughness: 0.8, alphaTest: 0.5, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.3, r * 2.3), mat);
    m.rotation.set(-1.35, 0.25, 0.3);
    group.add(m);
  }
  group.traverse(o => {
    o.castShadow = false;
    o.renderOrder = -1;
  });
  return group;
}
