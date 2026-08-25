import { parseAskAnswer } from "@/lib/library/askAnswer";
import type { AskShelfItem, AskUIMessage } from "@/lib/library/askLibrary";
import { contentTokens } from "@/lib/library/relatedHits";

export type ProvenanceSpan = {
  text: string;
  citeIndex: number | null;
};

export function shelfFromAskMessage(message: AskUIMessage): AskShelfItem[] {
  const seen = new Set<string>();
  const out: AskShelfItem[] = [];
  for (const part of message.parts) {
    if (part.type !== "data-shelf" || !Array.isArray(part.data)) continue;
    for (const hit of part.data) {
      const ownerType = hit.ownerType === "til" ? "til" : hit.ownerType === "bookmark" ? "bookmark" : null;
      const ownerId = typeof hit.ownerId === "string" ? hit.ownerId : "";
      const title = typeof hit.title === "string" ? hit.title : "";
      const href = typeof hit.href === "string" ? hit.href : "";
      const kind = typeof hit.kind === "string" ? hit.kind : "";
      const key = `${ownerType}:${ownerId}`;
      if (!ownerType || !ownerId || !title || !href || seen.has(key)) continue;
      seen.add(key);
      out.push({
        ownerType,
        ownerId,
        title,
        href,
        kind,
        snippet: typeof hit.snippet === "string" ? hit.snippet : "",
        note: typeof hit.note === "string" ? hit.note.trim() : "",
        url: typeof hit.url === "string" ? hit.url : "",
        thin: Boolean(hit.thin),
      });
    }
  }
  return out;
}

export function plainAskText(markdown: string): string {
  return markdown
    .replace(/^#+\s+/gm, "")
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1")
    .replace(/```[^\n]*/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitProse(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const parts = cleaned.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function overlapScore(unit: string, hit: AskShelfItem): number {
  const unitTokens = contentTokens(unit);
  if (unitTokens.length === 0) return 0;
  const hay = new Set(contentTokens(`${hit.title} ${hit.snippet} ${hit.note}`));
  const hits = unitTokens.filter((token) => hay.has(token)).length;
  const titleHits = contentTokens(hit.title).filter((token) => unitTokens.includes(token)).length;
  return hits + titleHits;
}

export function assignProvenance(text: string, shelf: AskShelfItem[]): ProvenanceSpan[] {
  const units = splitProse(text);
  if (units.length === 0) return [];
  if (shelf.length === 0) return units.map((unit) => ({ text: unit, citeIndex: null }));

  return units.map((unit) => {
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < shelf.length; i += 1) {
      const score = overlapScore(unit, shelf[i]);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    const needed = contentTokens(unit).length >= 8 ? 2 : 1;
    return { text: unit, citeIndex: bestScore >= needed && best >= 0 ? best : null };
  });
}

export function notesFromShelf(shelf: AskShelfItem[]): AskShelfItem[] {
  return shelf.filter((hit) => hit.note.trim().length > 0);
}

export type NextCard = {
  question: string;
  from: string;
  ownerKey: string;
};

const ASK_TEMPLATES = [
  (title: string) => `what's the actual takeaway from ${title}?`,
  (title: string) => `how does ${title} connect to this?`,
  (title: string) => `what did I note on ${title}?`,
];

function shortTitle(title: string): string {
  const cleaned = title.replace(/\s+/g, " ").trim();
  return cleaned.length > 52 ? `${cleaned.slice(0, 49).trimEnd()}…` : cleaned;
}

export function nextCardsFromShelf(question: string, answer: string, shelf: AskShelfItem[]): NextCard[] {
  if (shelf.length === 0) return [];
  const { body, summary } = parseAskAnswer(answer);
  const used = new Set(
    assignProvenance(`${summary} ${body}`, shelf)
      .map((span) => span.citeIndex)
      .filter((index): index is number => index != null)
  );
  const unused = shelf.filter((_, index) => !used.has(index));
  const pool = unused.length > 0 ? unused : shelf.slice(1);
  const source = pool.length > 0 ? pool : shelf;
  const asked = question.toLowerCase();
  const out: NextCard[] = [];

  for (const hit of source) {
    if (out.length >= 3) break;
    const title = shortTitle(hit.title);
    if (!title || asked.includes(title.toLowerCase().slice(0, 18))) continue;
    const template = ASK_TEMPLATES[out.length % ASK_TEMPLATES.length];
    const nextQuestion = template(title);
    if (out.some((card) => card.question === nextQuestion)) continue;
    out.push({
      question: nextQuestion,
      from: hit.title,
      ownerKey: `${hit.ownerType}:${hit.ownerId}`,
    });
  }
  return out;
}
