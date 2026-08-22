import type { AtlasCadence, AtlasDepth, ParsedAtlas } from "./types";

function clampWeeks(weeks: number): number {
  return Math.min(6, Math.max(3, weeks));
}

function toAntiScopeSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function appendUniqueAntiScope(antiScope: string[], slug: string): void {
  if (slug && !antiScope.includes(slug)) {
    antiScope.push(slug);
  }
}

export function parseAtlas(
  input: string,
  chips?: { depth?: AtlasDepth; cadence?: AtlasCadence; antiScope?: string },
): ParsedAtlas {
  let line = input.trim();

  let weeksPlanned = 4;
  let minutesPerSession = 45;
  let cadence: AtlasCadence = "weeknights";
  const depth: AtlasDepth = "working";
  const antiScope: string[] = [];

  const weeksMatch = line.match(/~?(\d+)\s*w(?:eeks?)?/i);
  if (weeksMatch) {
    weeksPlanned = clampWeeks(Number.parseInt(weeksMatch[1], 10));
    line = line.replace(weeksMatch[0], " ");
  }

  const hoursMatch = line.match(/~?(\d+)\s*h\b/i);
  if (hoursMatch) {
    minutesPerSession = Number.parseInt(hoursMatch[1], 10) * 60;
    line = line.replace(hoursMatch[0], " ");
  }

  const minutesMatch = line.match(/~?(\d+)\s*m(?:in(?:utes?)?)?\b/i);
  if (minutesMatch) {
    minutesPerSession = Number.parseInt(minutesMatch[1], 10);
    line = line.replace(minutesMatch[0], " ");
  }

  const cadenceMatch = line.match(/\b(weeknights|weekends|daily)\b/i);
  if (cadenceMatch) {
    cadence = cadenceMatch[1].toLowerCase() as AtlasCadence;
    line = line.replace(cadenceMatch[0], " ");
  }

  const noMatch = line.match(/\bno\s+([^,]+)/i);
  if (noMatch) {
    appendUniqueAntiScope(antiScope, toAntiScopeSlug(noMatch[1]));
    line = line.replace(noMatch[0], " ");
  }

  const notMatch = line.match(/\bnot\s+([^,]+)/i);
  if (notMatch) {
    appendUniqueAntiScope(antiScope, toAntiScopeSlug(notMatch[1]));
    line = line.replace(notMatch[0], " ");
  }

  let topic = line.replace(/\s+/g, " ").trim().replace(/\s*,\s*$/, "");

  let resolvedDepth = depth;
  let resolvedCadence = cadence;

  if (chips?.depth) {
    resolvedDepth = chips.depth;
  }
  if (chips?.cadence) {
    resolvedCadence = chips.cadence;
  }
  if (chips?.antiScope) {
    for (const part of chips.antiScope.split(",")) {
      appendUniqueAntiScope(antiScope, toAntiScopeSlug(part));
    }
  }

  return {
    topic,
    weeksPlanned,
    minutesPerSession,
    cadence: resolvedCadence,
    depth: resolvedDepth,
    antiScope,
  };
}
