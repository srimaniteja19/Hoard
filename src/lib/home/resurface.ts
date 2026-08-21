const MIN_USES = 2;
const MIN_IDLE_DAYS = 21;

export function isResurfaceEligible(useCount: number, daysSinceLastUse: number): boolean {
  return useCount >= MIN_USES && daysSinceLastUse >= MIN_IDLE_DAYS;
}

export function resurfaceScore(useCount: number, daysSinceLastUse: number): number {
  return Math.log(useCount + 1) * daysSinceLastUse;
}

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickDailyResurface<T extends { id: string | number; score: number }>(
  items: T[],
  userId: string,
  localDate: string,
  limit = 3,
  poolSize = 12
): T[] {
  const ranked = [...items].sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  const pool = ranked.slice(0, poolSize);
  const rng = mulberry32(fnv1a(`${userId}:${localDate}`));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(limit, pool.length));
}
