import { detectKindFromUrl } from "@/lib/detectKind";
import { parseTodo, type ParsedTodo } from "@/lib/todos/parse";
import type { KindType } from "@/types";
import type { TilType } from "@/db/schema";
import { parseSlash } from "@/lib/home/slashCommands";

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
  command: string | null;
  tilType: TilType | null;
  addedMinutes: number | null;
};

function normalizeCaptureInput(input: string): string {
  const leading = input.trimStart();
  if (!leading.startsWith("/")) return input.trim();
  const trimmed = leading.trimEnd();
  return leading !== leading.trimEnd() ? `${trimmed} ` : trimmed;
}

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
    command: null,
    tilType: null,
    addedMinutes: null,
  };
}

function queuePreview(trimmed: string, command: string | null = null): CapturePreview {
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
    command,
    addedMinutes: minutes,
    chips: [
      ...(command ? [{ label: `/${command.toUpperCase()}` }] : []),
      { label: kind },
      ...(host ? [{ label: host }] : []),
      { label: `${minutes} min` },
    ],
  };
}

function recordPreview(
  trimmed: string,
  command: string | null = null,
  tilType: TilType | null = null,
): CapturePreview {
  const body = /^\s*(?:til|learned)\b/i.test(trimmed)
    ? trimmed.replace(/^\s*(?:til|learned)\b[\s:;,.!?—–-]*/i, "")
    : trimmed;

  return {
    ...emptyPreview(),
    destination: "record",
    body,
    command,
    tilType,
    addedMinutes: 0,
    chips: [
      { label: "RECORD" },
      ...(tilType ? [{ label: tilType }] : []),
      { label: body.slice(0, 40) },
    ],
  };
}

function hasMatchedField(parsed: ParsedTodo, field: string): boolean {
  return parsed.matched.some((match) => match.field === field);
}

function agendaPreview(
  trimmed: string,
  today: Date,
  tz: string,
  command: string | null = null,
): CapturePreview {
  const parsed = parseTodo(trimmed, today, tz);
  const chips: CaptureChip[] = [
    ...(command ? [{ label: `/${command.toUpperCase()}` }] : []),
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
    command,
    addedMinutes: parsed.estimatedMinutes,
  };
}

function slashPreview(
  input: string,
  today: Date,
  tz: string,
): CapturePreview | null {
  const slash = parseSlash(input);
  if (slash.kind === "none") return null;

  if (slash.kind === "palette") {
    return {
      ...emptyPreview(),
      chips: slash.query
        ? [{ label: "COMMANDS" }, { label: `/${slash.query}` }]
        : [{ label: "COMMANDS" }],
    };
  }

  if (slash.kind === "unknown") {
    return {
      ...emptyPreview(),
      chips: [{ label: "UNKNOWN" }, { label: `/${slash.token}` }],
    };
  }

  const command = slash.entry.name;
  const dest = slash.entry.destination;

  if (dest === "queue") {
    if (!slash.rest) {
      return {
        ...emptyPreview(),
        destination: "queue",
        command,
        chips: [{ label: "QUEUE" }, { label: `/${command.toUpperCase()}` }],
      };
    }
    return queuePreview(slash.rest, command);
  }

  if (dest === "record") {
    if (!slash.rest) {
      return {
        ...emptyPreview(),
        destination: "record",
        command,
        tilType: slash.tilType,
        chips: [
          { label: "RECORD" },
          { label: `/${command.toUpperCase()}` },
          ...(slash.tilType ? [{ label: slash.tilType }] : []),
        ],
      };
    }
    return recordPreview(slash.rest, command, slash.tilType);
  }

  if (!slash.rest) {
    return {
      ...emptyPreview(),
      destination: "agenda",
      command,
      chips: [{ label: "AGENDA" }, { label: `/${command.toUpperCase()}` }],
    };
  }
  return agendaPreview(slash.rest, today, tz, command);
}

export function routeCapture(
  input: string,
  today: Date,
  tz: string,
): CapturePreview {
  const trimmed = normalizeCaptureInput(input);

  if (!trimmed) return emptyPreview();

  const fromSlash = slashPreview(trimmed, today, tz);
  if (fromSlash) return fromSlash;

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

export function canCommitCapture(preview: CapturePreview): boolean {
  if (!preview.destination) return false;
  if (preview.destination === "queue") return Boolean(preview.url && preview.host);
  if (preview.destination === "record") return Boolean(preview.body?.trim());
  return Boolean(preview.text?.trim());
}

export type CaptureRequest = { url: string; body: Record<string, unknown> };

/**
 * What committing a capture actually sends — each destination has its own
 * endpoint and payload shape (a bookmark's url/kind, a TIL's type/body, a
 * todo's raw text for the server to re-parse). Null only when the preview
 * has no destination yet; callers gate on canCommitCapture() first, so this
 * is a defensive total function rather than a case that's expected to fire.
 */
export function buildCaptureRequest(preview: CapturePreview): CaptureRequest | null {
  switch (preview.destination) {
    case "queue":
      return { url: "/api/bookmarks", body: { url: preview.url, ty: preview.kind, src: "Home capture" } };
    case "record":
      return { url: "/api/til", body: { type: preview.tilType ?? "FACT", body: preview.body } };
    case "agenda":
      return { url: "/api/todos", body: { text: preview.text } };
    default:
      return null;
  }
}
