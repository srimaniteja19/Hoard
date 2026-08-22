/**
 * Parser utilities for extracting structured presentation data from TIL entry bodies.
 * Supports both structured formats from the morphing composer and legacy/freeform text.
 */

export interface ParsedGotcha {
  thought: string;
  actually: string;
  cost?: string;
}

export function parseGotcha(body: string | null): ParsedGotcha {
  if (!body) {
    return {
      thought: "The initial assumption seemed correct.",
      actually: "The underlying reality behaved completely differently.",
    };
  }

  // Check for "I THOUGHT: ... ACTUALLY: ... COST: ..."
  const thoughtMatch = body.match(/(?:I THOUGHT|THOUGHT|MISTAKE|BELIEF):\s*([\s\S]*?)(?=(?:ACTUALLY|REALITY|TRUTH|COST):|$)/i);
  const actuallyMatch = body.match(/(?:ACTUALLY|REALITY|TRUTH|FIX):\s*([\s\S]*?)(?=(?:COST|IMPACT):|$)/i);
  const costMatch = body.match(/(?:COST|IMPACT|WHAT IT COST):\s*([\s\S]*?)$/i);

  if (thoughtMatch && actuallyMatch) {
    return {
      thought: thoughtMatch[1].trim(),
      actually: actuallyMatch[1].trim(),
      cost: costMatch ? costMatch[1].trim() : undefined,
    };
  }

  // Fallback: Split by newline
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return {
      thought: lines[0].replace(/^(?:I thought|Thought|Assumption):\s*/i, ""),
      actually: lines[1].replace(/^(?:Actually|Reality|Fix):\s*/i, ""),
      cost: lines.length >= 3 ? lines.slice(2).join(" ").replace(/^(?:Cost|Impact):\s*/i, "") : undefined,
    };
  }

  return {
    thought: "Initial intuitive expectation failed in practice.",
    actually: body,
  };
}

export interface ParsedQuote {
  quote: string;
  author?: string;
}

export function parseQuote(body: string | null): ParsedQuote {
  if (!body) return { quote: "" };

  // Check for "Quote" — Author or Author, Year
  const authorMatch = body.match(/^(?:["“]([\s\S]*?)["”]|([\s\S]*?))\s*(?:[-—–\n]\s*|\s+by\s+)([\s\S]*)$/i);
  if (authorMatch) {
    const quote = (authorMatch[1] || authorMatch[2] || "").trim();
    const author = authorMatch[3].trim();
    if (quote && author) {
      return { quote, author };
    }
  }

  // Fallback: entire text is quote
  return {
    quote: body.replace(/^["“]|["”]$/g, "").trim(),
  };
}

export interface ParsedOpinion {
  take: string;
  conviction: number; // 1 to 5
  ageDays: number;
}

export function parseOpinion(body: string | null, createdAt?: string | Date): ParsedOpinion {
  if (!body) {
    return { take: "", conviction: 4, ageDays: 1 };
  }

  let take = body;
  let conviction = 4;

  const convMatch = body.match(/\[(?:conviction|level):\s*(\d)\]/i);
  if (convMatch) {
    conviction = Math.min(5, Math.max(1, parseInt(convMatch[1], 10)));
    take = body.replace(/\[(?:conviction|level):\s*\d\]/i, "").trim();
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
  if (!body) return { name: "", instances: [] };

  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
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
