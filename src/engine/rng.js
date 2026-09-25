/** Small seeded PRNG (mulberry32) so every client replays the same throw. */
export function createRng(seed) {
  let a = hashSeed(seed) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: arr => arr[Math.floor(next() * arr.length)],
    sign: () => (next() < 0.5 ? -1 : 1)
  };
}

/** Hash strings or numbers into a 32-bit seed (FNV-1a). */
export function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const str = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}
