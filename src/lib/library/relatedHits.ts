const STOP = new Set([
  "about",
  "and",
  "are",
  "bad",
  "did",
  "didn",
  "does",
  "for",
  "from",
  "have",
  "how",
  "inside",
  "into",
  "not",
  "the",
  "this",
  "that",
  "what",
  "when",
  "why",
  "with",
  "work",
  "your",
  "saved",
  "library",
]);

/** Cosine similarity below this is treated as unrelated, even if it was nearest. */
export const ASK_RANK_FLOOR = 0.5;
/** High enough to keep a paraphrase that does not share keywords. */
export const ASK_RANK_STRONG = 0.68;

export function contentTokens(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    const token = raw.length > 4 && raw.endsWith("s") && !raw.endsWith("ss") ? raw.slice(0, -1) : raw;
    if (STOP.has(token) || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

export function hasLexicalOverlap(query: string, title: string, snippet: string): boolean {
  const needles = contentTokens(query);
  if (needles.length === 0) return false;
  const hay = ` ${contentTokens(`${title} ${snippet}`).join(" ")} `;
  const hits = needles.filter((token) => hay.includes(` ${token} `));
  const needed = needles.length >= 4 ? 2 : 1;
  return hits.length >= needed;
}

export function relatedHits<T extends { rank: number; title: string; snippet: string }>(
  query: string,
  hits: T[]
): T[] {
  return hits.filter((hit) => {
    if (!Number.isFinite(hit.rank) || hit.rank < ASK_RANK_FLOOR) return false;
    if (hit.rank >= ASK_RANK_STRONG) return true;
    return hasLexicalOverlap(query, hit.title, hit.snippet);
  });
}
