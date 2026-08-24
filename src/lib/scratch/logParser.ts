import { ScrapEntities } from "@/db/schema";

export interface LogVerbMeta {
  label: string;
  glyph: string;
  color: string;
}

export const LOG_VERBS: Record<string, LogVerbMeta> = {
  watched: { label: "Film", glyph: "▶", color: "violet" },
  saw: { label: "Person", glyph: "◉", color: "pink" },
  read: { label: "Book", glyph: "▤", color: "cyan" },
  played: { label: "Game", glyph: "🎮", color: "pink" },
  walked: { label: "Movement", glyph: "◈", color: "lime" },
  ran: { label: "Movement", glyph: "◈", color: "lime" },
  swam: { label: "Movement", glyph: "◈", color: "cyan" },
  lifted: { label: "Movement", glyph: "◈", color: "lime" },
  ate: { label: "Food", glyph: "◍", color: "orange" },
  cooked: { label: "Food", glyph: "◍", color: "orange" },
  drank: { label: "Food", glyph: "◍", color: "orange" },
  went: { label: "Place", glyph: "◆", color: "yellow" },
  visited: { label: "Place", glyph: "◆", color: "yellow" },
  made: { label: "Made", glyph: "⚒", color: "yellow" },
  built: { label: "Made", glyph: "⚒", color: "yellow" },
  shipped: { label: "Made", glyph: "🚀", color: "lime" },
  listened: { label: "Audio", glyph: "♫", color: "violet" },
};

export interface ParsedLogResult {
  isLog: boolean;
  occurredOn: string; // YYYY-MM-DD
  entities: ScrapEntities;
  tags: string[];
  cleanContent: string;
}

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tues: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thurs: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  satur: 6,
  sat: 6,
};

const MONTH_NAMES_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEKDAY_NAMES_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Extracts relative date keywords from text and calculates the occurred_on ISO date.
 */
export function extractRelativeDate(
  text: string,
  referenceDate = new Date()
): { dateIso: string; matchText: string } | null {
  const lower = text.toLowerCase();

  // 1. "N days ago"
  const daysAgoMatch = lower.match(/\b(\d+)\s+days?\s+ago\b/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - days);
    return { dateIso: toIsoDate(d), matchText: daysAgoMatch[0] };
  }

  // 2. "yesterday" / "last night"
  const yMatch = lower.match(/\b(yesterday|last night)\b/);
  if (yMatch) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 1);
    return { dateIso: toIsoDate(d), matchText: yMatch[0] };
  }

  // 3. "today" / "this morning" / "tonight"
  const tMatch = lower.match(/\b(today|this morning|tonight)\b/);
  if (tMatch) {
    return { dateIso: toIsoDate(referenceDate), matchText: tMatch[0] };
  }

  // 4. "on (day)" or standalone "(day)" (e.g. "on saturday", "friday")
  const dayMatch = lower.match(/\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|wed|thurs|fri|sat|sun)\b/);
  if (dayMatch) {
    const targetDay = WEEKDAY_MAP[dayMatch[1]];
    if (targetDay !== undefined) {
      const currentDay = referenceDate.getDay();
      let diff = currentDay - targetDay;
      if (diff <= 0) diff += 7; // Look at most recent past occurrence
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - diff);
      return { dateIso: toIsoDate(d), matchText: dayMatch[0] };
    }
  }

  return null;
}

/**
 * Generates shift note when occurred_on differs from created_at date
 * e.g. "LOGGED SUN · HAPPENED SAT"
 */
export function formatShiftNote(occurredIso: string, createdIso: string): string | undefined {
  if (occurredIso === createdIso) return undefined;

  const occ = new Date(occurredIso + "T00:00:00");
  const cre = new Date(createdIso + "T00:00:00");

  const occW = WEEKDAY_NAMES_SHORT[occ.getDay()] || "";
  const creW = WEEKDAY_NAMES_SHORT[cre.getDay()] || "";

  return `LOGGED ${creW} · HAPPENED ${occW}`;
}

/**
 * Parses any raw text into a full Log Entity or general Scrap definition
 */
export function parseLogEntry(
  rawInput: string,
  referenceDate = new Date()
): ParsedLogResult {
  const raw = rawInput.trim();
  const tags = (raw.match(/#[a-zA-Z][\w-]*/g) || []).map((t) => t.toLowerCase());

  let isLog = false;
  let verb = "";
  let verbMeta: LogVerbMeta | null = null;
  let rest = raw;

  // 1. Check ~ prefix manual override
  if (/^~/.test(rest)) {
    isLog = true;
    rest = rest.replace(/^~/, "").trim();
  }

  // 2. Check leading verb
  const firstWordMatch = rest.match(/^([a-zA-Z]+)/);
  if (firstWordMatch) {
    const firstWord = firstWordMatch[1].toLowerCase();
    if (LOG_VERBS[firstWord]) {
      isLog = true;
      verb = firstWord.toUpperCase();
      verbMeta = LOG_VERBS[firstWord];
      rest = rest.slice(firstWordMatch[0].length).trim();
    }
  }

  const createdIso = toIsoDate(referenceDate);
  let occurredOn = createdIso;

  // 3. Extract relative date
  const relDate = extractRelativeDate(rest, referenceDate);
  if (relDate) {
    occurredOn = relDate.dateIso;
    // Remove date expression from title
    rest = rest.replace(new RegExp(`\\b${relDate.matchText}\\b`, "i"), " ").trim();
  }

  // If not a log, return early with occurredOn
  if (!isLog) {
    return {
      isLog: false,
      occurredOn,
      entities: {},
      tags,
      cleanContent: raw,
    };
  }

  // 4. Extract measure (e.g. "10 miles", "62 pages", "45 min")
  let measure: string | undefined;
  let unit: string | undefined;
  const measureMatch = rest.match(/(\d+(?:\.\d+)?)\s*(miles?|km|kg|lbs?|pages?|mins?|minutes?|hours?|h|reps?)\b/i);
  if (measureMatch) {
    measure = measureMatch[1];
    unit = measureMatch[2].toUpperCase();
    rest = rest.replace(measureMatch[0], " ").trim();
  }

  // 5. Extract rating (e.g. "9/10", "4.5/10", "5 stars")
  let rating: string | undefined;
  const ratingMatch = rest.match(/(\d+(?:\.\d+)?\s*\/\s*10|\b[1-5]\s*stars?\b)/i);
  if (ratingMatch) {
    rating = ratingMatch[0];
    rest = rest.replace(ratingMatch[0], " ").trim();
  }

  // 6. Extract person ("with <Name>")
  let person: string | undefined;
  const personMatch = rest.match(/\bwith\s+([A-Z][\w-]*)/);
  if (personMatch) {
    person = personMatch[1];
    rest = rest.replace(personMatch[0], " ").trim();
  }

  // 7. Extract place ("at <Place>")
  let place: string | undefined;
  const placeMatch = rest.match(/\bat\s+([A-Z][\w\s]*?)(?:\s+(?:with|on|#|\d)|$|\.|\,)/i);
  if (placeMatch) {
    place = placeMatch[1].trim();
    rest = rest.replace(placeMatch[0], " ").trim();
  }

  // 8. Clean remainder of tags
  for (const t of tags) {
    rest = rest.replace(new RegExp(t, "ig"), " ").trim();
  }

  // Clean extra spaces / punctuation
  const cleanTitle = rest.replace(/\s+/g, " ").replace(/^[,.\s-]+|[,.\s-]+$/g, "").trim();
  const shiftNote = formatShiftNote(occurredOn, createdIso);

  // If there's no verbMeta and no entities extracted, this is a plain unparsed day note
  const isPlain = !verbMeta && !measure && !person && !place;

  const entities: ScrapEntities = {
    verb: verb || "NOTED",
    label: verbMeta?.label || (isPlain ? undefined : "Note"),
    glyph: verbMeta?.glyph || "·",
    color: verbMeta?.color || "orange",
    title: cleanTitle || raw,
    measure,
    unit,
    person,
    place,
    rating,
    shiftNote,
    isPlain,
  };

  return {
    isLog: true,
    occurredOn,
    entities,
    tags,
    cleanContent: raw,
  };
}
