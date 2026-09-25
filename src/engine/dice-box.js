import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getPolyhedron } from "./polyhedra.js";
import { getDieGeometry } from "./geometry.js";
import { getDieMaterial } from "./materials.js";
import { createInclusion } from "./inclusions.js";
import { simulateThrow, remapToResults } from "./physics.js";
import { playImpact } from "./sound.js";
import { PHYSICS_HZ, TRAY } from "../constants.js";

const FADE_SECONDS = 0.45;
const DEFAULTS = { quality: "medium", speed: 1, fadeDelay: 2, volume: 0.5, scale: 1, zIndex: 90 };

/**
 * Full-screen transparent WebGL overlay that plays back simulated throws.
 * Only renders while something is moving or fading.
 */
export class DiceBox {
  /**
   * @param {object} [opts]
   * @param {HTMLElement} [opts.container]
   * @param {() => object} [opts.settings]  Returns {quality, speed, fadeDelay, volume, scale}.
   */
  constructor({ container, settings } = {}) {
    this.container = container ?? document.body;
    this.settings = () => ({ ...DEFAULTS, ...(settings?.() ?? {}) });
    this.throws = new Set();
    this.running = false;
    this._frame = this._frame.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  /** Create the renderer on first use. */
  ensure() {
    if (this.renderer) return;
    const s = this.settings();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = s.quality !== "low";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const el = renderer.domElement;
    el.id = "sargas-dice-canvas";
    Object.assign(el.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: String(s.zIndex) });
    this.container.appendChild(el);
    this.renderer = renderer;
    this.quality = s.quality;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  scene.environmentIntensity = 0.75;
  // Tilt the studio environment so its ceiling light doesn't glare straight back at a top-down camera.
  scene.environmentRotation.set(0.9, 0.4, 0);
    this.scene = scene;

    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(-10, 26, 8);
    key.castShadow = true;
    const shadowSize = { low: 512, medium: 1024, high: 2048 }[s.quality] ?? 1024;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    Object.assign(key.shadow.camera, { left: -TRAY.width / 2 - 2, right: TRAY.width / 2 + 2, top: TRAY.depth / 2 + 2, bottom: -TRAY.depth / 2 - 2, near: 1, far: 60 });
    key.shadow.radius = 4;
    key.shadow.bias = -0.0005;
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.5));

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(TRAY.width * 2, TRAY.depth * 2), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    this.camera = new THREE.PerspectiveCamera(28, 1, 1, 200);
    this.camera.up.set(0, 0, -1);
    window.addEventListener("resize", this._onResize);
    this._onResize();
  }

  _onResize() {
    if (!this.renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    const s = this.settings();
    this.renderer.setPixelRatio(s.quality === "high" ? window.devicePixelRatio : Math.min(window.devicePixelRatio, 1.25));
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    // Fit the whole tray on screen ("contain").
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(TRAY.depth / 2 / t, TRAY.width / 2 / (t * cam.aspect)) + 1;
    cam.position.set(0, dist, 0);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    if (!this.running) this.renderer.render(this.scene, cam);
  }

  /**
   * Throw some dice.
   * @param {object} spec
   * @param {{kind:number, variant?:string, style:object, value:number|null}[]} spec.dice
   * @param {number|string} spec.seed
   * @returns {{settled: Promise<void>, done: Promise<void>}}  settled: dice stopped; done: dice removed.
   */
  roll({ dice, seed }) {
    this.ensure();
    const s = this.settings();
    const simDice = dice.map(d => ({ kind: d.kind, physics: d.style.physics }));
    const sim = simulateThrow({ dice: simDice, seed, scale: s.scale });
    const remaps = remapToResults(simDice, sim.tops, dice.map(d => d.value ?? null), seed);

    const group = new THREE.Group();
    const meshes = dice.map((d, i) => {
      const poly = getPolyhedron(d.kind);
      const mesh = new THREE.Mesh(getDieGeometry(poly), getDieMaterial(d.style, d.kind, { quality: this.quality, variant: d.variant, anisotropy: this.renderer.capabilities.getMaxAnisotropy() }));
      mesh.castShadow = true;
      const inclusion = createInclusion(d.style.inclusion, poly);
      if (inclusion) mesh.add(inclusion);
      mesh.userData.remap = new THREE.Quaternion(...remaps[i]);
      mesh.userData.baseScale = s.scale;
      mesh.scale.setScalar(s.scale);
      group.add(mesh);
      return mesh;
    });
    this.scene.add(group);

    let resolveSettled, resolveDone;
    const t = {
      dice,
      sim,
      meshes,
      group,
      speed: s.speed,
      fadeDelay: s.fadeDelay,
      volume: s.volume,
      start: performance.now(),
      lastFrame: -1,
      settledAt: null,
      settled: new Promise(r => (resolveSettled = r)),
      done: new Promise(r => (resolveDone = r))
    };
    t.resolveSettled = resolveSettled;
    t.resolveDone = resolveDone;
    this._apply(t, 0);
    this.throws.add(t);
    this._start();
    return { settled: t.settled, done: t.done };
  }

  /** Remove all dice immediately. */
  clear() {
    for (const t of this.throws) this._remove(t);
    if (this.renderer) this.renderer.render(this.scene, this.camera);
  }

  _start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this._frame);
  }

  _frame(now) {
    for (const t of [...this.throws]) this._update(t, now);
    this.renderer.render(this.scene, this.camera);
    if (this.throws.size) requestAnimationFrame(this._frame);
    else this.running = false;
  }

  _update(t, now) {
    const elapsed = (now - t.start) / 1000;
    const last = t.sim.frameCount - 1;
    const f = Math.min(last, elapsed * PHYSICS_HZ * t.speed);
    this._apply(t, f);

    // Collision sounds for frames we passed since the last update.
    const fi = Math.floor(f);
    if (fi > t.lastFrame) {
      for (const c of t.sim.collisions) {
        if (c.frame > t.lastFrame && c.frame <= fi) playImpact(t.dice[c.die].style.sound, c.strength, t.volume);
      }
      t.lastFrame = fi;
    }

    if (f >= last && t.settledAt === null) {
      t.settledAt = now;
      t.resolveSettled();
    }
    if (t.settledAt !== null) {
      const since = (now - t.settledAt) / 1000 - t.fadeDelay;
      if (since > 0) {
        const k = Math.max(0, 1 - since / FADE_SECONDS);
        for (const m of t.meshes) m.scale.setScalar(m.userData.baseScale * k * k);
        if (k <= 0) this._remove(t);
      }
    }
  }

  _apply(t, f) {
    const i0 = Math.floor(f), i1 = Math.min(i0 + 1, t.sim.frameCount - 1), a = f - i0;
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    t.meshes.forEach((mesh, d) => {
      const fr = t.sim.frames[d];
      const o0 = i0 * 7, o1 = i1 * 7;
      mesh.position.set(
        fr[o0] + (fr[o1] - fr[o0]) * a,
        fr[o0 + 1] + (fr[o1 + 1] - fr[o0 + 1]) * a,
        fr[o0 + 2] + (fr[o1 + 2] - fr[o0 + 2]) * a
      );
      qa.set(fr[o0 + 3], fr[o0 + 4], fr[o0 + 5], fr[o0 + 6]);
      qb.set(fr[o1 + 3], fr[o1 + 4], fr[o1 + 5], fr[o1 + 6]);
      mesh.quaternion.slerpQuaternions(qa, qb, a).multiply(mesh.userData.remap);
    });
  }

  _remove(t) {
    this.scene.remove(t.group);
    this.throws.delete(t);
    t.resolveSettled();
    t.resolveDone();
  }
}
