import * as CANNON from "cannon-es";
import { getPolyhedron, readTop, remapRotation, m3 } from "./polyhedra.js";
import { createRng } from "./rng.js";
import { PHYSICS_HZ, TRAY } from "../constants.js";

const GRAVITY = -70;
const MAX_SECONDS = 8;
const MAX_ATTEMPTS = 6;
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
 * @param {{kind:number, physics?:object}[]} opts.dice  One entry per physical die (d100 is two d10s).
 * @param {number|string} opts.seed
 * @param {number} [opts.scale=1]  Dice size multiplier.
 * @returns {{frameCount:number, frames:Float32Array[], collisions:{frame:number,die:number,strength:number}[], tops:{value:number,direction:number[],alignment:number}[]}}
 */
export function simulateThrow({ dice, seed, scale = 1 }) {
  const rng = createRng(seed);
  let result;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    result = runOnce(dice, rng, scale);
    if (result.tops.every(t => t.alignment >= FLAT_ALIGNMENT)) break;
  }
  return result;
}

function runOnce(dice, rng, scale) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0), allowSleep: true });
  world.solver.iterations = 14;
  world.broadphase = new CANNON.NaiveBroadphase();

  const tableMat = new CANNON.Material("table");
  const wallMat = new CANNON.Material("wall");
  const floor = new CANNON.Body({ mass: 0, material: tableMat, shape: new CANNON.Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);

  const hw = TRAY.width / 2, hd = TRAY.depth / 2;
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
    body.addShape(hullShape(die.kind, scale));

    const spread = (i - (n - 1) / 2) * 1.6 * scale + rng.range(-0.6, 0.6);
    const edgeX = hw - 2, edgeZ = hd - 2;
    const start = [
      [-edgeX, spread * 0.6],
      [edgeX, spread * 0.6],
      [spread, -edgeZ],
      [spread, edgeZ]
    ][side];
    body.position.set(start[0], rng.range(2.5, 4.5) * scale, start[1]);
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
  while (frame < maxFrames) {
    world.step(1 / PHYSICS_HZ);
    frame++;
    record();
    if (frame > 20 && bodies.every(b => b.sleepState === CANNON.Body.SLEEPING)) break;
  }

  const tops = bodies.map((b, i) => {
    const inv = b.quaternion.conjugate();
    const up = inv.vmult(new CANNON.Vec3(0, 1, 0));
    return readTop(getPolyhedron(dice[i].kind), [up.x, up.y, up.z]);
  });
  return { frameCount: frame + 1, frames: buffers.map(b => Float32Array.from(b)), collisions, tops };
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
