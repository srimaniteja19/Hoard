import { detectKindFromUrl } from "@/lib/detectKind";
import { parseTodo, type ParsedTodo } from "@/lib/todos/parse";
import type { KindType } from "@/types";

export type CaptureDestination = "queue" | "record" | "agenda";

export type CaptureChip = { label: string };

export type CapturePreview = {
  destination: CaptureDestination | null;
  url: string | null;
  kind: KindType | null;
  host: string | null;
  body: string | null;
  text: string | null;
  chips: CaptureChip[];
  parsed: ParsedTodo | null;
};

function emptyPreview(): CapturePreview {
  return {
    destination: null,
    url: null,
    kind: null,
    host: null,
    body: null,
    text: null,
    chips: [],
    parsed: null,
  };
}

function queuePreview(trimmed: string): CapturePreview {
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const kind = detectKindFromUrl(url) ?? "ART";
  const minutes = kind === "VID" ? 45 : kind === "PPR" ? 40 : 12;
  let host: string | null = null;

  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    host = null;
  }

  return {
    ...emptyPreview(),
    destination: "queue",
    url,
    kind,
    host,
    chips: [
      { label: kind },
      ...(host ? [{ label: host }] : []),
      { label: `${minutes} min` },
    ],
  };
}

function recordPreview(trimmed: string): CapturePreview {
  const body = /^\s*(?:til|learned)\b/i.test(trimmed)
    ? trimmed.replace(/^\s*(?:til|learned)\b[\s:;,.!?—–-]*/i, "")
    : trimmed;

  return {
    ...emptyPreview(),
    destination: "record",
    body,
    chips: [{ label: "RECORD" }, { label: body.slice(0, 40) }],
  };
}

function hasMatchedField(parsed: ParsedTodo, field: string): boolean {
  return parsed.matched.some((match) => match.field === field);
}

function agendaPreview(
  trimmed: string,
  today: Date,
  tz: string,
): CapturePreview {
  const parsed = parseTodo(trimmed, today, tz);
  const chips: CaptureChip[] = [
    { label: `${parsed.estimatedMinutes} min` },
    { label: parsed.energy },
  ];

  if (
    hasMatchedField(parsed, "dueOffsetDays") &&
    parsed.dueOffsetDays !== null
  ) {
    chips.push({
      label:
        parsed.dueOffsetDays === 0 ? "today" : `+${parsed.dueOffsetDays}d`,
    });
  }
  if (
    hasMatchedField(parsed, "remindAtLocal") &&
    parsed.remindAtLocal !== null
  ) {
    chips.push({ label: `⏰ ${parsed.remindAtLocal}` });
  }
  if (
    hasMatchedField(parsed, "recurrenceRule") &&
    parsed.recurrenceRule !== null
  ) {
    chips.push({ label: parsed.recurrenceRule });
  }
  if (hasMatchedField(parsed, "tags")) {
    chips.push(...parsed.tags.map((tag) => ({ label: `#${tag}` })));
  }

  return {
    ...emptyPreview(),
    destination: "agenda",
    text: trimmed,
    chips,
    parsed,
  };
}

export function routeCapture(
  input: string,
  today: Date,
  tz: string,
): CapturePreview {
  const trimmed = input.trim();

  if (!trimmed) return emptyPreview();
  if (/^(?:https?:\/\/|www\.)/i.test(trimmed)) {
    return queuePreview(trimmed);
  }
  if (
    /^(?:til|learned)\b/i.test(trimmed) ||
    /\bI learned\b/i.test(trimmed) ||
    /\bturns out\b/i.test(trimmed)
  ) {
    return recordPreview(trimmed);
  }
  return agendaPreview(trimmed, today, tz);
}
