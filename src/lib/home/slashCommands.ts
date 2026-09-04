import { tilTypeValues, type TilType } from "@/db/schema";

export type SlashDestination = "queue" | "record" | "agenda";
export type SlashCommandId = "bookmark" | "til" | "todo";

export type PaletteEntry = {
  name: string;
  aliases: string[];
  commandId: SlashCommandId;
  destination: SlashDestination;
  destLabel: "QUEUE" | "RECORD" | "AGENDA";
  hint: string;
  example: string;
  placeholder: string;
  tilType: TilType | null;
  group: "capture" | "type";
};

const TIL_HINTS: Record<TilType, string> = {
  FACT: "A crisp thing you now know",
  GOTCHA: "What broke, and why it actually broke",
  SNIPPET: "A small piece of code worth keeping",
  PATTERN: "A structure you recognized in the wild",
  QUOTE: "A line worth stealing",
  OPINION: "Your verdict, not a citation",
  LINK: "A URL plus why it matters",
  NEWS: "Key developments, briefing, or intelligence",
};

const TIL_PLACEHOLDERS: Record<TilType, string> = {
  FACT: "what did you learn?",
  GOTCHA: "what bit you, and the real cause…",
  SNIPPET: "what this snippet does…",
  PATTERN: "the pattern you just saw…",
  QUOTE: "the line, then who said it…",
  OPINION: "the take…",
  LINK: "why this link is going in the record…",
  NEWS: "headline or bulleted news briefing…",
};

export const PALETTE_ENTRIES: PaletteEntry[] = [
  {
    name: "bookmark",
    aliases: ["bm", "url", "queue", "save", "hoard"],
    commandId: "bookmark",
    destination: "queue",
    destLabel: "QUEUE",
    hint: "Stash a URL in the unread pile",
    example: "/bookmark https://…",
    placeholder: "https://…",
    tilType: null,
    group: "capture",
  },
  {
    name: "til",
    aliases: ["learn", "record", "note"],
    commandId: "til",
    destination: "record",
    destLabel: "RECORD",
    hint: "File something you just learned",
    example: "/til redis is single-threaded",
    placeholder: "what did you learn?",
    tilType: null,
    group: "capture",
  },
  {
    name: "todo",
    aliases: ["task", "do", "agenda"],
    commandId: "todo",
    destination: "agenda",
    destLabel: "AGENDA",
    hint: "Park a task with time, energy, due",
    example: "/todo call the vet tomorrow ~10m",
    placeholder: "call the vet tomorrow ~10m",
    tilType: null,
    group: "capture",
  },
  ...tilTypeValues.map((type) => ({
    name: type.toLowerCase(),
    aliases: [] as string[],
    commandId: "til" as const,
    destination: "record" as const,
    destLabel: "RECORD" as const,
    hint: TIL_HINTS[type],
    example: `/${type.toLowerCase()} …`,
    placeholder: TIL_PLACEHOLDERS[type],
    tilType: type,
    group: "type" as const,
  })),
];

const ENTRY_BY_TOKEN = new Map<string, PaletteEntry>();
for (const entry of PALETTE_ENTRIES) {
  ENTRY_BY_TOKEN.set(entry.name, entry);
  for (const alias of entry.aliases) {
    if (!ENTRY_BY_TOKEN.has(alias)) ENTRY_BY_TOKEN.set(alias, entry);
  }
}

export function findEntry(token: string): PaletteEntry | null {
  return ENTRY_BY_TOKEN.get(token.toLowerCase()) ?? null;
}

export function filterPalette(query: string, group?: PaletteEntry["group"]): PaletteEntry[] {
  const q = query.toLowerCase();
  const pool = group ? PALETTE_ENTRIES.filter((entry) => entry.group === group) : PALETTE_ENTRIES;
  if (!q) {
    return pool.filter((entry) => (group ? true : entry.group === "capture"));
  }
  return pool
    .filter(
      (entry) =>
        entry.name.startsWith(q) || entry.aliases.some((alias) => alias.startsWith(q)),
    )
    .sort((a, b) => {
      if (a.group !== b.group) return a.group === "capture" ? -1 : 1;
      const aExact = a.name === q || a.aliases.includes(q) ? 0 : 1;
      const bExact = b.name === q || b.aliases.includes(q) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.name.length - b.name.length || a.name.localeCompare(b.name);
    });
}

export type SlashParse =
  | { kind: "none" }
  | { kind: "palette"; query: string }
  | { kind: "unknown"; token: string; rest: string }
  | {
      kind: "command";
      entry: PaletteEntry;
      token: string;
      rest: string;
      rawRest: string;
      tilType: TilType | null;
    };

const TYPE_NAMES = new Set(tilTypeValues.map((type) => type.toLowerCase()));

function stripLeadingTilType(rest: string): { tilType: TilType | null; body: string } {
  if (!rest) return { tilType: null, body: "" };
  const first = rest.split(/\s+/, 1)[0]?.toLowerCase() ?? "";
  if (!TYPE_NAMES.has(first)) return { tilType: null, body: rest };
  const exact = first.toUpperCase() as TilType;
  const remainder = rest.slice(first.length).replace(/^\s+/, "");
  const hasBodyOrExplicitSpace = remainder.length > 0 || /\s$/.test(rest) || rest === first;
  if (!hasBodyOrExplicitSpace) return { tilType: null, body: rest };
  return { tilType: exact, body: remainder };
}

export function parseSlash(input: string): SlashParse {
  if (!input.startsWith("/")) return { kind: "none" };

  const after = input.slice(1);
  const tokenMatch = after.match(/^([^\s]*)([\s\S]*)$/);
  const token = (tokenMatch?.[1] ?? "").toLowerCase();
  const restRaw = tokenMatch?.[2] ?? "";
  const hasSpace = /^\s/.test(restRaw);
  const rawRest = restRaw.replace(/^\s+/, "");

  if (!hasSpace) {
    return { kind: "palette", query: token };
  }

  const entry = findEntry(token);
  if (!entry) return { kind: "unknown", token, rest: rawRest };

  let tilType = entry.tilType;
  let rest = rawRest;
  if (entry.commandId === "til" && !entry.tilType) {
    const stripped = stripLeadingTilType(rawRest);
    if (stripped.tilType) {
      tilType = stripped.tilType;
      rest = stripped.body;
    } else {
      tilType = "FACT";
      rest = rawRest;
    }
  }

  return { kind: "command", entry, token, rest, rawRest, tilType };
}

export type PaletteState = {
  open: boolean;
  mode: "command" | "type";
  matches: PaletteEntry[];
  query: string;
};

export function slashPaletteState(input: string, focused: boolean): PaletteState {
  const closed: PaletteState = { open: false, mode: "command", matches: [], query: "" };
  if (!focused) return closed;

  const slash = parseSlash(input);
  if (slash.kind === "none") return closed;

  if (slash.kind === "palette") {
    return {
      open: true,
      mode: "command",
      matches: filterPalette(slash.query),
      query: slash.query,
    };
  }

  if (slash.kind === "unknown") {
    return {
      open: true,
      mode: "command",
      matches: filterPalette(slash.token),
      query: slash.token,
    };
  }

  if (slash.entry.commandId === "til" && !slash.entry.tilType) {
    const typeQuery = slash.rawRest.includes(" ") ? null : slash.rawRest.toLowerCase();
    if (typeQuery !== null) {
      const matches = filterPalette(typeQuery, "type");
      if (typeQuery === "" || matches.length > 0) {
        return { open: true, mode: "type", matches, query: typeQuery };
      }
    }
  }

  return closed;
}

export function applyPaletteSelection(
  input: string,
  entry: PaletteEntry,
  mode: "command" | "type",
): string {
  if (mode === "type") {
    const token = input.match(/^\/\S+/)?.[0] ?? "/til";
    return `${token} ${entry.name} `;
  }
  return `/${entry.name} `;
}

export function commandPrefix(input: string): string {
  const slash = parseSlash(input);
  if (slash.kind !== "command") return "";
  const tokenPrefix = `/${slash.token} `;
  if (
    slash.entry.commandId === "til" &&
    !slash.entry.tilType &&
    slash.tilType &&
    slash.rawRest !== slash.rest &&
    (slash.rest.length > 0 || /\s/.test(slash.rawRest))
  ) {
    return `/${slash.token} ${slash.tilType.toLowerCase()} `;
  }
  return tokenPrefix;
}

export function displayPills(input: string): string[] {
  const slash = parseSlash(input);
  if (slash.kind !== "command") return [];
  const pills = [`/${slash.token.toUpperCase()}`];
  if (
    slash.entry.commandId === "til" &&
    !slash.entry.tilType &&
    slash.tilType &&
    slash.rawRest !== slash.rest &&
    (slash.rest.length > 0 || /\s/.test(slash.rawRest))
  ) {
    pills.push(`/${slash.tilType}`);
  }
  return pills;
}

export const CAPTURE_STARTERS = PALETTE_ENTRIES.filter((entry) => entry.group === "capture");
