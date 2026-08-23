import { ScrapKind } from "@/db/schema";

export const STOP_WORDS = new Set(
  (
    "the a an and or but of to in on at is are was were be been it its this that these those " +
    "for with from by as if then than so not no you your my me i we our they them their has have had do does " +
    "did can could would should will just only very more most some any what when where why how which who"
  ).split(" ")
);

export interface ParseChip {
  type: "kind" | "tag" | "act" | "ghost";
  label: string;
}

export interface ParsedSlab {
  kind: ScrapKind;
  color: string;
  tilt: string;
  tags: string[];
  chips: ParseChip[];
  wordCount: number;
  isGhost: boolean;
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

export function parseSlabText(input: string): ParsedSlab {
  const raw = input.trim();
  const wordCount = raw ? raw.split(/\s+/).filter(Boolean).length : 0;
  const isGhost = !raw;

  if (isGhost) {
    return {
      kind: "FRAGMENT",
      color: "cyan",
      tilt: "0deg",
      tags: [],
      chips: [{ type: "kind", label: "FRAGMENT" }],
      wordCount: 0,
      isGhost: true,
    };
  }

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

  const tags = (raw.match(/#[\w-]+/g) || []).map((t) => t.toLowerCase());

  const chips: ParseChip[] = [{ type: "kind", label: kind }];

  for (const tag of tags) {
    chips.push({ type: "tag", label: tag });
  }

  if (kind === "ACTION") {
    chips.push({ type: "act", label: "WILL OFFER AS A TODO" });
  }
  if (kind === "QUESTION") {
    chips.push({ type: "act", label: "STAYS OPEN UNTIL ANSWERED" });
  }

  return {
    kind,
    color,
    tilt: getDeterministicTilt(raw),
    tags,
    chips,
    wordCount,
    isGhost: false,
  };
}

export function formatScrapDayHeader(dateStr: string, todayIso?: string, yesterdayIso?: string): string {
  const now = new Date();
  const currentToday = todayIso || now.toISOString().slice(0, 10);
  const yDate = new Date(now);
  yDate.setDate(yDate.getDate() - 1);
  const currentYesterday = yesterdayIso || yDate.toISOString().slice(0, 10);

  const parsed = new Date(dateStr + "T00:00:00");
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dayNum = parsed.getDate();
  const monthStr = monthNames[parsed.getMonth()] || "";

  if (dateStr === currentToday) {
    return `TODAY · ${dayNum} ${monthStr}`;
  }
  if (dateStr === currentYesterday) {
    return "YESTERDAY";
  }
  return `${dayNum} ${monthStr}`;
}
