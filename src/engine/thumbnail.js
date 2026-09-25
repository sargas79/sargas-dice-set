import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getPolyhedron } from "./polyhedra.js";
import { getStyleGeometry } from "./geometry.js";
import { getDieMaterial } from "./materials.js";
import { createInclusion } from "./inclusions.js";

let stage = null;
const urls = new Map();

function getStage(size) {
  if (stage && stage.size === size) return stage;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environmentIntensity = 0.75;
  // Tilt the studio environment so its ceiling light doesn't glare straight back at a top-down camera.
  scene.environmentRotation.set(0.9, 0.4, 0);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3, 6, 4);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.5));
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 2.3, 3.3);
  camera.lookAt(0, 0, 0);
  stage = { renderer, scene, camera, size };
  return stage;
}

/**
 * Render a single die of a style at a three-quarter angle.
 * @returns {HTMLCanvasElement} The shared renderer canvas (copy it before the next call).
 */
export function renderDie(style, { kind = 6, size = 256, quality = "medium", rotation = [0, Math.PI / 4, 0], variant } = {}) {
  const { renderer, scene, camera } = getStage(size);
  const poly = getPolyhedron(kind);
  const mesh = new THREE.Mesh(getStyleGeometry(poly, style), getDieMaterial(style, kind, { quality, variant }));
  const inclusion = createInclusion(style.inclusion, poly);
  if (inclusion) mesh.add(inclusion);
  mesh.rotation.set(...rotation);
  mesh.scale.setScalar(1.25 * (0.8 / poly.radius));
  scene.add(mesh);
  renderer.render(scene, camera);
  scene.remove(mesh);
  return renderer.domElement;
}

/** Cached PNG data URL of a style's d6, for the settings menu. */
export function styleThumbnail(style, size = 160) {
  const key = `${style.id}:${size}`;
  if (!urls.has(key)) urls.set(key, renderDie(style, { size }).toDataURL("image/png"));
  return urls.get(key);
}
