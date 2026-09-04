/**
 * Parser utilities for extracting structured presentation data and attached notes from TIL entry bodies.
 * Supports structured formats from the morphing composer, attached notes, and legacy/freeform text.
 */

const NOTE_DELIMITER = "\n\n--- NOTE ---\n";

export function parseNote(body: string | null): string | null {
  if (!body) return null;
  const idx = body.indexOf(NOTE_DELIMITER);
  if (idx !== -1) {
    const noteContent = body.slice(idx + NOTE_DELIMITER.length).trim();
    return noteContent || null;
  }
  const match = body.match(/(?:\n\n|\n)(?:--- NOTE ---|📝 Note:|NOTE:)\s*([\s\S]*)$/i);
  if (match && match[1]) {
    const noteContent = match[1].trim();
    return noteContent || null;
  }
  return null;
}

export function stripNote(body: string | null): string {
  if (!body) return "";
  const idx = body.indexOf(NOTE_DELIMITER);
  if (idx !== -1) {
    return body.slice(0, idx).trim();
  }
  const match = body.match(/(?:\n\n|\n)(?:--- NOTE ---|📝 Note:|NOTE:)\s*[\s\S]*$/i);
  if (match && typeof match.index === "number") {
    return body.slice(0, match.index).trim();
  }
  return body.trim();
}

export function combineWithNote(body: string | null, note: string | null): string {
  const base = stripNote(body);
  const trimmedNote = note ? note.trim() : "";
  if (!trimmedNote) return base;
  return `${base}${NOTE_DELIMITER}${trimmedNote}`;
}

export interface ParsedGotcha {
  thought: string;
  actually: string;
  cost?: string;
}

export function parseGotcha(body: string | null): ParsedGotcha {
  const cleanBody = stripNote(body);
  if (!cleanBody) {
    return {
      thought: "The initial assumption seemed correct.",
      actually: "The underlying reality behaved completely differently.",
    };
  }

  // Check for "I THOUGHT: ... ACTUALLY: ... COST: ..."
  const thoughtMatch = cleanBody.match(/(?:I THOUGHT|THOUGHT|MISTAKE|BELIEF):\s*([\s\S]*?)(?=(?:ACTUALLY|REALITY|TRUTH|COST):|$)/i);
  const actuallyMatch = cleanBody.match(/(?:ACTUALLY|REALITY|TRUTH|FIX):\s*([\s\S]*?)(?=(?:COST|IMPACT):|$)/i);
  const costMatch = cleanBody.match(/(?:COST|IMPACT|WHAT IT COST):\s*([\s\S]*?)$/i);

  if (thoughtMatch && actuallyMatch) {
    return {
      thought: thoughtMatch[1].trim(),
      actually: actuallyMatch[1].trim(),
      cost: costMatch ? costMatch[1].trim() : undefined,
    };
  }

  // Fallback: Split by newline
  const lines = cleanBody.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return {
      thought: lines[0].replace(/^(?:I thought|Thought|Assumption):\s*/i, ""),
      actually: lines[1].replace(/^(?:Actually|Reality|Fix):\s*/i, ""),
      cost: lines.length >= 3 ? lines.slice(2).join(" ").replace(/^(?:Cost|Impact):\s*/i, "") : undefined,
    };
  }

  return {
    thought: "Initial intuitive expectation failed in practice.",
    actually: cleanBody,
  };
}

export interface ParsedQuote {
  quote: string;
  author?: string;
}

export function parseQuote(body: string | null): ParsedQuote {
  const cleanBody = stripNote(body);
  if (!cleanBody) return { quote: "" };

  // Check for "Quote" — Author or Author, Year
  const authorMatch = cleanBody.match(/^(?:["“]([\s\S]*?)["”]|([\s\S]*?))\s*(?:[-—–\n]\s*|\s+by\s+)([\s\S]*)$/i);
  if (authorMatch) {
    const quote = (authorMatch[1] || authorMatch[2] || "").trim();
    const author = authorMatch[3].trim();
    if (quote && author) {
      return { quote, author };
    }
  }

  // Fallback: entire text is quote
  return {
    quote: cleanBody.replace(/^["“]|["”]$/g, "").trim(),
  };
}

export interface ParsedOpinion {
  take: string;
  conviction: number; // 1 to 5
  ageDays: number;
}

export function parseOpinion(body: string | null, createdAt?: string | Date): ParsedOpinion {
  const cleanBody = stripNote(body);
  if (!cleanBody) {
    return { take: "", conviction: 4, ageDays: 1 };
  }

  let take = cleanBody;
  let conviction = 4;

  const convMatch = cleanBody.match(/\[(?:conviction|level):\s*(\d)\]/i);
  if (convMatch) {
    conviction = Math.min(5, Math.max(1, parseInt(convMatch[1], 10)));
    take = cleanBody.replace(/\[(?:conviction|level):\s*\d\]/i, "").trim();
  }

  const created = createdAt ? new Date(createdAt) : new Date();
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - created.getTime());
  const ageDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return {
    take,
    conviction,
    ageDays,
  };
}

export interface ParsedPattern {
  name: string;
  instances: { date: string; note: string }[];
}

export function parsePattern(body: string | null, defaultDate: string): ParsedPattern {
  const cleanBody = stripNote(body);
  if (!cleanBody) return { name: "", instances: [] };

  const lines = cleanBody.split("\n").map((l) => l.trim()).filter(Boolean);
  const name = lines[0] || "";
  const instances: { date: string; note: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^[-*•]\s*(?:\[([^\]]+)\]\s*)?([\s\S]*)$/);
    if (match) {
      instances.push({
        date: match[1] || defaultDate,
        note: match[2] || "",
      });
    } else {
      instances.push({
        date: defaultDate,
        note: line,
      });
    }
  }

  return { name, instances };
}

export interface BulletExtraction {
  intro?: string;
  bullets: string[];
}

export function extractBulletPoints(text: string | null): BulletExtraction | null {
  if (!text) return null;
  const cleaned = text.trim();
  if (!cleaned) return null;

  // Does the text contain any bullet markers?
  const hasBulletMarkers = /(?:^|\n|\s)[*•-]\s+/.test(cleaned);
  if (!hasBulletMarkers) return null;

  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];
  let intro: string | undefined;

  for (const line of lines) {
    const isBulletLine = /^[-*•]\s+/.test(line);
    // Count inline bullets like "* item 1 * item 2"
    const inlineBulletMatches = (line.match(/(?:^|\s)[*•-]\s+/g) || []).length;

    if (inlineBulletMatches > 1) {
      // Split inline bullets
      const parts = line.split(/(?:^|\s)[*•-]\s+/).map((p) => p.trim()).filter(Boolean);
      bullets.push(...parts);
    } else if (isBulletLine) {
      bullets.push(line.replace(/^[-*•]\s+/, "").trim());
    } else if (bullets.length === 0 && !intro) {
      intro = line;
    } else {
      // Continuation line of previous bullet or new line
      if (bullets.length > 0) {
        bullets[bullets.length - 1] += " " + line;
      } else {
        bullets.push(line);
      }
    }
  }

  if (bullets.length === 0) return null;
  return { intro, bullets };
}

export interface ParsedNews {
  headline?: string;
  items: string[];
  source?: string;
}

export function parseNews(body: string | null): ParsedNews {
  const cleanBody = stripNote(body);
  if (!cleanBody) return { items: [] };

  let text = cleanBody;
  let source: string | undefined;

  // Extract trailing SOURCE: or FROM: or VIA:
  const sourceMatch = text.match(/(?:\n|^)(?:SOURCE|FROM|VIA):\s*([^\n]+)$/i);
  if (sourceMatch) {
    source = sourceMatch[1].trim();
    text = text.slice(0, sourceMatch.index).trim();
  }

  // Check for explicit HEADLINE: or TOPIC: or TITLE:
  let headline: string | undefined;
  const headlineMatch = text.match(/^(?:HEADLINE|TOPIC|TITLE):\s*([^\n]+)(?:\n+([\s\S]*))?$/i);
  if (headlineMatch) {
    headline = headlineMatch[1].trim();
    text = (headlineMatch[2] || "").trim();
  }

  // Use extractBulletPoints if text contains bullets
  const extracted = extractBulletPoints(text);
  if (extracted) {
    if (!headline && extracted.intro) {
      headline = extracted.intro;
    }
    return {
      headline,
      items: extracted.bullets,
      source,
    };
  }

  // Fallback: split by newlines or treat as single item
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!headline && lines.length > 1) {
    headline = lines[0];
    return {
      headline,
      items: lines.slice(1),
      source,
    };
  }

  return {
    headline,
    items: lines.length > 0 ? lines : [text],
    source,
  };
}

