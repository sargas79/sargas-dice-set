import * as CANNON from "cannon-es";
import { getPolyhedron, readTop, remapRotation, m3 } from "./polyhedra.js";
import { createRng } from "./rng.js";
import { PHYSICS_HZ, TRAY, TRAY_SHORT_SIDE } from "../constants.js";

const GRAVITY = -70;
const MAX_SECONDS = 8;
/** Re-throws allowed when a die ends up leaning; fewer for big rolls, which cost more to simulate. */
const maxAttempts = n => (n <= 4 ? 6 : n <= 10 ? 3 : 1);
/** Start slots per row along the throwing edge, and rows before stacking higher. */
const SLOTS_PER_ROW = 6;
const ROWS_PER_LAYER = 3;
/** A die is "cocked" (leaning on another die or a wall) below this alignment. */
const FLAT_ALIGNMENT = 0.95;
const DEFAULT_PHYSICS = { mass: 1, friction: 0.35, restitution: 0.35 };

const shapeCache = new Map();

function hullShape(kind, scale) {
  const key = `${kind}:${scale}`;
  if (shapeCache.has(key)) return shapeCache.get(key);
  const poly = getPolyhedron(kind);
  const s = 0.96 * scale;
  const shape = new CANNON.ConvexPolyhedron({
    vertices: poly.vertices.map(([x, y, z]) => new CANNON.Vec3(x * s, y * s, z * s)),
    faces: poly.faces.map(f => [...f.verts])
  });
  shapeCache.set(key, shape);
  return shape;
}

/**
 * Simulate one throw. Everything is driven by `seed`, so every client that
 * runs this with the same inputs gets the same animation.
 *
 * @param {object} opts
 * @param {{kind:number, physics?:object, size?:number}[]} opts.dice  One entry per physical die (d100 is two d10s); size scales that die.
 * @param {number|string} opts.seed
 * @param {number} [opts.scale=1]  Dice size multiplier.
 * @param {{width:number, depth:number}} [opts.tray]  Tray size in world units (default: fixed 16:9 tray).
 * @returns {{frameCount:number, frames:Float32Array[], collisions:{frame:number,die:number,strength:number}[], tops:{value:number,direction:number[],alignment:number}[]}}
 */
export function simulateThrow({ dice, seed, scale = 1, tray = TRAY }) {
  const steps = throwSteps(dice, seed, scale, tray);
  let r = steps.next();
  while (!r.done) r = steps.next();
  return r.value;
}

/**
 * Same as simulateThrow, but yields to the browser every few milliseconds so
 * big rolls don't freeze the page. The result is identical to simulateThrow.
 * @param {object} opts  As simulateThrow.
 * @param {number} [budgetMs=8]  Work per slice before yielding.
 */
export async function simulateThrowAsync({ dice, seed, scale = 1, tray = TRAY }, budgetMs = 8) {
  const steps = throwSteps(dice, seed, scale, tray);
  let r = steps.next();
  let sliceStart = performance.now();
  while (!r.done) {
    if (performance.now() - sliceStart > budgetMs) {
      await new Promise(resolve => setTimeout(resolve, 0));
      sliceStart = performance.now();
    }
    r = steps.next();
  }
  return r.value;
}

/** Generator that yields between physics steps and returns the throw result. */
function* throwSteps(dice, seed, scale, tray) {
  const rng = createRng(seed);
  let result;
  for (let attempt = 0, max = maxAttempts(dice.length); attempt < max; attempt++) {
    result = yield* runOnce(dice, rng, scale, tray);
    if (result.tops.every(t => t.alignment >= FLAT_ALIGNMENT)) break;
  }
  return result;
}

function* runOnce(dice, rng, scale, tray) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0), allowSleep: true });
  world.solver.iterations = 14;
  world.broadphase = new CANNON.SAPBroadphase(world);

  const tableMat = new CANNON.Material("table");
  const wallMat = new CANNON.Material("wall");
  const floor = new CANNON.Body({ mass: 0, material: tableMat, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);

  const hw = tray.width / 2, hd = tray.depth / 2;
  const walls = [
    [new CANNON.Vec3(-hw, 0, 0), [0, Math.PI / 2, 0]],
    [new CANNON.Vec3(hw, 0, 0), [0, -Math.PI / 2, 0]],
    [new CANNON.Vec3(0, 0, -hd), [0, 0, 0]],
    [new CANNON.Vec3(0, 0, hd), [0, Math.PI, 0]]
  ];
  for (const [p, e] of walls) {
    const wall = new CANNON.Body({ mass: 0, material: wallMat, shape: new CANNON.Plane(), position: p });
    wall.quaternion.setFromEuler(...e);
    world.addBody(wall);
  }

  // Throw from a random side toward the middle of the tray.
  const side = rng.int(0, 3);
  const n = dice.length;
  const bodies = dice.map((die, i) => {
    const phys = { ...DEFAULT_PHYSICS, ...(die.physics ?? {}) };
    const mat = new CANNON.Material(`die-${i}`);
    world.addContactMaterial(new CANNON.ContactMaterial(mat, tableMat, { friction: phys.friction, restitution: phys.restitution }));
    world.addContactMaterial(new CANNON.ContactMaterial(mat, wallMat, { friction: 0.1, restitution: 0.6 }));
    const body = new CANNON.Body({
      mass: phys.mass,
      material: mat,
      linearDamping: 0.12,
      angularDamping: 0.12,
      sleepSpeedLimit: 0.25,
      sleepTimeLimit: 0.25
    });
    body.addShape(hullShape(die.kind, scale * (die.size ?? 1)));

    // Start in a grid along the throwing edge (rows inward, then stacked layers) so big rolls stay inside the tray.
    const gap = 1.8 * scale;
    const col = i % SLOTS_PER_ROW, row = Math.floor(i / SLOTS_PER_ROW);
    const inRow = Math.min(SLOTS_PER_ROW, n - row * SLOTS_PER_ROW);
    const along = (col - (inRow - 1) / 2) * gap + rng.range(-0.3, 0.3);
    const inward = (row % ROWS_PER_LAYER) * gap;
    const layer = Math.floor(row / ROWS_PER_LAYER);
    const edgeX = hw - 2 - inward, edgeZ = hd - 2 - inward;
    const start = [
      [-edgeX, along],
      [edgeX, along],
      [along, -edgeZ],
      [along, edgeZ]
    ][side];
    body.position.set(start[0], (rng.range(2.5, 4) + layer * 2) * scale, start[1]);
    const target = new CANNON.Vec3(rng.range(-hw * 0.35, hw * 0.35), 0, rng.range(-hd * 0.35, hd * 0.35));
    const dir = target.vsub(body.position);
    dir.y = 0;
    dir.normalize();
    const speed = rng.range(14, 24);
    body.velocity.set(dir.x * speed, rng.range(-2, 4), dir.z * speed);
    body.angularVelocity.set(rng.range(-25, 25), rng.range(-25, 25), rng.range(-25, 25));
    body.quaternion.set(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize();
    world.addBody(body);
    return body;
  });

  const collisions = [];
  const lastHit = new Array(n).fill(-99);
  let frame = 0;
  bodies.forEach((body, i) => {
    body.addEventListener("collide", e => {
      const strength = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (strength < 1.5 || frame - lastHit[i] < 3) return;
      lastHit[i] = frame;
      collisions.push({ frame, die: i, strength });
    });
  });

  const maxFrames = MAX_SECONDS * PHYSICS_HZ;
  const buffers = bodies.map(() => []);
  const record = () => {
    bodies.forEach((b, i) => {
      buffers[i].push(b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    });
  };
  record();
  let stillFrames = 0;
  while (frame < maxFrames) {
    yield;
    world.step(1 / PHYSICS_HZ);
    frame++;
    record();
    // Settled once every die is asleep or barely moving for a short while (big piles can jitter forever).
    const resting = bodies.every(b => b.sleepState === CANNON.Body.SLEEPING || (b.velocity.lengthSquared() < 0.05 && b.angularVelocity.lengthSquared() < 0.2));
    stillFrames = resting ? stillFrames + 1 : 0;
    if (frame > 20 && stillFrames >= 12) break;
  }

  const tops = bodies.map((b, i) => {
    const inv = b.quaternion.conjugate();
    const up = inv.vmult(new CANNON.Vec3(0, 1, 0));
    return readTop(getPolyhedron(dice[i].kind), [up.x, up.y, up.z]);
  });
  return { frameCount: frame + 1, frames: buffers.map(b => Float32Array.from(b)), collisions, tops };
}

/**
 * Tray matching a screen shape: the short side stays fixed so dice keep their
 * on-screen size, and the long side stretches to fill the screen.
 * @param {number} aspect  Width / height of the screen.
 */
export function trayForAspect(aspect) {
  const a = Math.min(4, Math.max(0.25, aspect || 16 / 9));
  return a >= 1 ? { width: TRAY_SHORT_SIDE * a, depth: TRAY_SHORT_SIDE } : { width: TRAY_SHORT_SIDE, depth: TRAY_SHORT_SIDE / a };
}

/**
 * For each die, the extra local rotation (quaternion [x,y,z,w]) that makes
 * the simulated top show the rolled value.
 * @param {{kind:number}[]} dice
 * @param {{direction:number[]}[]} tops  From simulateThrow.
 * @param {(number|null)[]} values  Desired values; null keeps the physics result.
 */
export function remapToResults(dice, tops, values, seed) {
  const rng = createRng(`${seed}:remap`);
  return dice.map((die, i) => {
    if (values[i] == null) return [0, 0, 0, 1];
    const R = remapRotation(getPolyhedron(die.kind), values[i], tops[i].direction, rng.next);
    return m3.toQuaternion(R);
  });
}
