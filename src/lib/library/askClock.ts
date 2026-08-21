import { getLoggedForDate } from "@/lib/dal/shared";

export type AskClock = {
  iso: string;
  label: string;
};

export function addDaysIso(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + delta)).toISOString().slice(0, 10);
}

export function formatAskClock(timeZone = "UTC", now = new Date()): AskClock {
  const iso = getLoggedForDate(timeZone, now);
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
  return { iso, label };
}

export function askClockLine(clock: AskClock): string {
  return `Today is ${clock.label} (${clock.iso}). Resolve "today", "yesterday", "this week", and "last N days" from that date. Never use a different year or month from training data.`;
}

export function relativeRangeHint(query: string, iso: string): string {
  const days = query.match(/\blast\s+(\d+)\s+days?\b/i);
  if (days) {
    const n = Math.min(366, Math.max(1, Number(days[1])));
    return `That means ${addDaysIso(iso, 1 - n)} through ${iso} inclusive.`;
  }
  if (/\b(today|tonight)\b/i.test(query)) return `That means calendar day ${iso}.`;
  if (/\byesterday\b/i.test(query)) return `That means ${addDaysIso(iso, -1)}.`;
  if (/\bthis week\b/i.test(query)) return `This week ends on ${iso}.`;
  return "";
}

export function wireRecencyFilter(query: string): "day" | "week" | "month" | "year" {
  if (/\b(today|tonight|right now|currently|this hour|spot price)\b/i.test(query)) return "day";
  const days = query.match(/\blast\s+(\d+)\s+days?\b/i);
  if (days) return Number(days[1]) > 7 ? "month" : "week";
  if (/\b(this week|last week|past week|yesterday|24h)\b/i.test(query)) return "week";
  if (/\b(this month|last month|past month|ytd)\b/i.test(query)) return "month";
  if (/\b(this year|last year)\b/i.test(query)) return "year";
  return "week";
}

export function wireSearchPrompt(query: string, clock: AskClock): string {
  const range = relativeRangeHint(query, clock.iso);
  return [
    `Today is ${clock.label} (${clock.iso}).`,
    range,
    "Call perplexity_search once. If the question uses relative time, put those explicit ISO dates in the search query.",
    "Search the current year. Do not write an answer.",
    "",
    `Question: ${query.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}
