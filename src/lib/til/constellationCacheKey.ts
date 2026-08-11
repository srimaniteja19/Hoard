/**
 * Constellation layout cache key (SPECTACLE.md §3, Phase 10). A pure hash of
 * the inputs that determine graph shape — if neither changes, a previously
 * settled d3-force layout is still valid and the client can skip simulation.
 */

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function computeConstellationCacheKey(
  userId: string,
  entryCount: number,
  maxUpdatedAt: string | null
): string {
  const raw = `${userId}:${entryCount}:${maxUpdatedAt ?? "none"}`;
  return fnv1a(raw).toString(16).padStart(8, "0");
}
