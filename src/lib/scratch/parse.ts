import { ScrapKind, ScrapEntities } from "@/db/schema";
import { parseLogEntry, LOG_VERBS } from "./logParser";

export const STOP_WORDS = new Set(
  (
    "the a an and or but of to in on at is are was were be been it its this that these those " +
    "for with from by as if then than so not no you your my me i we our they them their has have had do does " +
    "did can could would should will just only very more most some any what when where why how which who"
  ).split(" ")
);

export interface ParseChip {
  type: "dest" | "kind" | "tag" | "meas" | "who" | "when" | "act" | "ghost";
  label: string;
  isSheet?: boolean;
}

export interface ParsedSlab {
  kind: ScrapKind;
  color: string;
  tilt: string;
  tags: string[];
  chips: ParseChip[];
  wordCount: number;
  isGhost: boolean;
  isLog: boolean;
  occurredOn?: string;
  entities?: ScrapEntities;
}

const TILTS = ["-.5deg", ".4deg", "-.3deg", ".55deg", "-.4deg", ".35deg", "-.25deg", ".5deg", "-.35deg"];

export function getDeterministicTilt(idOrText: string): string {
  let hash = 0;
  for (let i = 0; i < idOrText.length; i++) {
    hash = (hash * 31 + idOrText.charCodeAt(i)) >>> 0;
  }
  return TILTS[hash % TILTS.length];
}

export function extractKeywords(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
  return Array.from(new Set(matches.filter((w) => !STOP_WORDS.has(w))));
}

export function parseSlabText(input: string, referenceDate = new Date()): ParsedSlab {
  const raw = input.trim();
  const wordCount = raw ? raw.split(/\s+/).filter(Boolean).length : 0;
  const isGhost = !raw;

  if (isGhost) {
    return {
      kind: "FRAGMENT",
      color: "cyan",
      tilt: "0deg",
      tags: [],
      chips: [
        { type: "dest", label: "→ THE SHELF" },
        { type: "kind", label: "FRAGMENT" },
      ],
      wordCount: 0,
      isGhost: true,
      isLog: false,
    };
  }

  // Check for LOG entry first
  const logParsed = parseLogEntry(raw, referenceDate);
  if (logParsed.isLog) {
    const chips: ParseChip[] = [{ type: "dest", label: "→ THE SHEET", isSheet: true }];
    const label = logParsed.entities.label;

    chips.push({
      type: "kind",
      label: label ? `LOG · ${label.toUpperCase()}` : "LOG",
    });

    if (logParsed.entities.shiftNote) {
      chips.push({
        type: "when",
        label: logParsed.entities.shiftNote,
      });
    }

    if (logParsed.entities.measure && logParsed.entities.unit) {
      chips.push({
        type: "meas",
        label: `${logParsed.entities.measure} ${logParsed.entities.unit}`,
      });
    }

    if (logParsed.entities.person) {
      chips.push({
        type: "who",
        label: logParsed.entities.person.toUpperCase(),
      });
    }

    for (const tag of logParsed.tags) {
      chips.push({ type: "tag", label: tag });
    }

    if (logParsed.entities.isPlain) {
      chips.push({
        type: "ghost",
        label: "NO ENTITY — FILES AS A PLAIN DAY NOTE",
      });
    }

    return {
      kind: "LOG",
      color: "orange",
      tilt: getDeterministicTilt(raw),
      tags: logParsed.tags,
      chips,
      wordCount,
      isGhost: false,
      isLog: true,
      occurredOn: logParsed.occurredOn,
      entities: logParsed.entities,
    };
  }

  // General Shelf Scraps
  let kind: ScrapKind = "FRAGMENT";
  let color = "cyan";

  if (/^\?/.test(raw) || /\?\s*$/.test(raw)) {
    kind = "QUESTION";
    color = "violet";
  } else if (/^>/.test(raw)) {
    kind = "QUOTE";
    color = "yellow";
  } else if (/^(→|->)/.test(raw)) {
    kind = "ACTION";
    color = "lime";
  } else if (/^!!/.test(raw)) {
    kind = "RANT";
    color = "pink";
  } else if (wordCount > 22) {
    kind = "IDEA";
    color = "cyan";
  }

  const tags = (raw.match(/#[a-zA-Z][\w-]*/g) || []).map((t) => t.toLowerCase());

  const chips: ParseChip[] = [
    { type: "dest", label: "→ THE SHELF" },
    { type: "kind", label: kind },
  ];

  for (const tag of tags) {
    chips.push({ type: "tag", label: tag });
  }

  if (kind === "ACTION") {
    chips.push({ type: "ghost", label: "WILL OFFER AS A TODO" });
  }
  if (kind === "QUESTION") {
    chips.push({ type: "ghost", label: "STAYS OPEN UNTIL ANSWERED IN TIL" });
  }

  return {
    kind,
    color,
    tilt: getDeterministicTilt(raw),
    tags,
    chips,
    wordCount,
    isGhost: false,
    isLog: false,
    occurredOn: logParsed.occurredOn,
    entities: {},
  };
}

export function getLocalTodayIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatScrapDayHeader(dateStr: string, todayIso?: string, yesterdayIso?: string): string {
  const now = new Date();
  const currentToday = todayIso || getLocalTodayIso(now);
  const yDate = new Date(now);
  yDate.setDate(yDate.getDate() - 1);
  const currentYesterday = yesterdayIso || getLocalTodayIso(yDate);

  // Parse YYYY-MM-DD components directly to prevent UTC shift
  const [yearStr, monthStrNum, dayStrNum] = dateStr.split("-");
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStrNum, 10) - 1;
  const d = parseInt(dayStrNum, 10);
  const parsed = new Date(y, m, d);

  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayNum = parsed.getDate();
  const monthStr = monthNames[parsed.getMonth()] || "";
  const weekdayStr = dayNames[parsed.getDay()] || "";

  if (dateStr === currentToday) {
    return `TODAY · ${weekdayStr} ${dayNum} ${monthStr}`;
  }
  if (dateStr === currentYesterday) {
    return `YESTERDAY · ${weekdayStr} ${dayNum} ${monthStr}`;
  }
  return `${weekdayStr} ${dayNum} ${monthStr}`;
}
