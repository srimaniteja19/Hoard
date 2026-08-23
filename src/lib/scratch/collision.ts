import { extractKeywords } from "./parse";

export interface CollisionCandidate {
  id: string;
  content: string;
  createdAt: string | Date;
  ago?: string;
}

export interface CollisionHit {
  id: string;
  content: string;
  highlightedText: string;
  ago: string;
  sharedKeywords: string[];
}

export function formatRelativeAgo(date: string | Date, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays === 0) {
    if (diffHours <= 1) return "JUST NOW";
    return "TODAY";
  }
  if (diffDays === 1) return "1 DAY";
  return `${diffDays} DAYS`;
}

export function highlightMatches(text: string, words: string[]): string {
  let res = text;
  for (const w of words) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b(${escaped})`, "ig");
    res = res.replace(regex, "<mark>$1</mark>");
  }
  return res;
}

export function findCollisions(
  inputText: string,
  candidates: CollisionCandidate[],
  maxResults: number = 3,
  now: Date = new Date()
): CollisionHit[] {
  const inputKeywords = extractKeywords(inputText);
  if (inputKeywords.length < 2) {
    return [];
  }

  const scored: Array<{
    candidate: CollisionCandidate;
    sharedKeywords: string[];
  }> = [];

  for (const c of candidates) {
    const candidateKeywords = new Set(extractKeywords(c.content));
    const shared = Array.from(new Set(inputKeywords.filter((k) => candidateKeywords.has(k))));
    if (shared.length >= 1) {
      scored.push({
        candidate: c,
        sharedKeywords: shared,
      });
    }
  }

  scored.sort((a, b) => b.sharedKeywords.length - a.sharedKeywords.length);

  return scored.slice(0, maxResults).map(({ candidate, sharedKeywords }) => {
    const ago = candidate.ago || formatRelativeAgo(candidate.createdAt, now);
    return {
      id: candidate.id,
      content: candidate.content,
      highlightedText: highlightMatches(candidate.content, sharedKeywords),
      ago,
      sharedKeywords,
    };
  });
}
