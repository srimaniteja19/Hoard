export const SUGGESTED_MIN_COSINE = 0.75;
const MAX_PER_NODE = 2;

export type SuggestedEdgeEntry = {
  id: string;
  tags: string[];
  supersededById: string | null;
};

export type SimilarityPair = {
  a: string;
  b: string;
  cosine: number;
};

export type SuggestedEdge = {
  source: string;
  target: string;
  kind: "suggested";
};

function satelliteId(id: string): string {
  return `entry:${id}`;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function sharesTag(a: SuggestedEdgeEntry, b: SuggestedEdgeEntry): boolean {
  if (a.tags.length === 0 || b.tags.length === 0) return false;
  const other = new Set(b.tags);
  return a.tags.some((t) => other.has(t));
}

function isSupersession(a: SuggestedEdgeEntry, b: SuggestedEdgeEntry): boolean {
  return a.supersededById === b.id || b.supersededById === a.id;
}

export function selectSuggestedEdges(
  entries: SuggestedEdgeEntry[],
  pairs: SimilarityPair[]
): SuggestedEdge[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const degree = new Map<string, number>();
  const selected: SuggestedEdge[] = [];

  const ranked = [...pairs].sort((x, y) => y.cosine - x.cosine);

  for (const pair of ranked) {
    if (pair.cosine < SUGGESTED_MIN_COSINE) continue;
    if (pair.a === pair.b) continue;

    const key = pairKey(pair.a, pair.b);
    if (seen.has(key)) continue;
    seen.add(key);

    const left = byId.get(pair.a);
    const right = byId.get(pair.b);
    if (!left || !right) continue;
    if (sharesTag(left, right)) continue;
    if (isSupersession(left, right)) continue;

    const leftDeg = degree.get(pair.a) ?? 0;
    const rightDeg = degree.get(pair.b) ?? 0;
    if (leftDeg >= MAX_PER_NODE || rightDeg >= MAX_PER_NODE) continue;

    degree.set(pair.a, leftDeg + 1);
    degree.set(pair.b, rightDeg + 1);
    const [source, target] = [satelliteId(pair.a), satelliteId(pair.b)].sort();
    selected.push({ source, target, kind: "suggested" });
  }

  return selected;
}
