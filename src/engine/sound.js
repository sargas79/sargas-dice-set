/**
 * Collision sounds synthesised with WebAudio (no audio files to ship).
 * Each material is a filtered noise burst plus an optional resonant ping.
 */

const MATERIALS = {
  bone: { freq: 1500, q: 4, ping: 0, decay: 0.05 },
  wood: { freq: 900, q: 3, ping: 0, decay: 0.06 },
  glass: { freq: 3800, q: 10, ping: 3200, decay: 0.12 },
  metal: { freq: 2600, q: 18, ping: 2100, decay: 0.22 },
  stone: { freq: 650, q: 1.5, ping: 0, decay: 0.05 },
  ceramic: { freq: 3000, q: 8, ping: 2600, decay: 0.09 },
  resin: { freq: 1900, q: 4, ping: 0, decay: 0.06 }
};

let context = null;
let noiseBuffer = null;

function audio() {
  if (context) return context;
  const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Ctx) return null;
  context = new Ctx();
  const len = context.sampleRate * 0.3;
  noiseBuffer = context.createBuffer(1, len, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return context;
}

/**
 * @param {string} material  Key of MATERIALS.
 * @param {number} strength  Impact velocity from the physics step.
 * @param {number} volume    0..1 master volume.
 */
export function playImpact(material, strength, volume) {
  if (volume <= 0) return;
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const m = MATERIALS[material] ?? MATERIALS.resin;
  const gainValue = Math.min(1, strength / 18) * volume;
  if (gainValue < 0.01) return;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = gainValue;
  out.connect(ctx.destination);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = m.freq * (0.9 + Math.random() * 0.2);
  filter.Q.value = m.q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(1, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + m.decay);
  src.connect(filter).connect(env).connect(out);
  src.start(now);
  src.stop(now + m.decay + 0.02);

  if (m.ping) {
    const osc = ctx.createOscillator();
    osc.frequency.value = m.ping * (0.95 + Math.random() * 0.1);
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0.25, now);
    pg.gain.exponentialRampToValueAtTime(0.001, now + m.decay * 1.5);
    osc.connect(pg).connect(out);
    osc.start(now);
    osc.stop(now + m.decay * 1.5 + 0.02);
  }
}
