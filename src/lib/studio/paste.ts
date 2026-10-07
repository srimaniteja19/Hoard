import {
  PILLAR_LABEL,
  STUDIO_FORMATS,
  STUDIO_PILLARS,
  STUDIO_STATUSES,
  type StudioFormat,
  type StudioPiece,
  type StudioPillar,
  type StudioScene,
  type StudioSource,
  type StudioStatus,
} from "./types";

/**
 * "Paste everything": turn one block of text (a Studio block, a Claude reply, or JSON)
 * into piece fields. Pure, so it runs live as you type and is easy to test.
 */

export interface PastedPiece {
  title?: string;
  status?: StudioStatus;
  format?: StudioFormat;
  pillar?: StudioPillar;
  seriesTitle?: string;
  part?: number;
  script?: StudioScene[];
  caption?: string;
  hashtags?: string;
  extraHashtags?: string;
  sources?: StudioSource[];
  notes?: string;
  coverUrl?: string;
}

export type PasteField = Exclude<keyof PastedPiece, "part">;

export interface PastedSeriesPart {
  n: number;
  title: string;
  hook?: string;
  summary?: string;
  script?: StudioScene[];
  rawText: string;
}

export interface PastedSeries {
  title: string;
  theme?: string;
  pillar?: StudioPillar;
  format?: StudioFormat;
  parts: PastedSeriesPart[];
}

/** Fields in the order the preview shows them. `seriesTitle` carries the part number with it. */
export const PASTE_FIELDS: PasteField[] = [
  "title",
  "seriesTitle",
  "status",
  "format",
  "pillar",
  "script",
  "caption",
  "hashtags",
  "extraHashtags",
  "sources",
  "notes",
  "coverUrl",
];

export const BLOCK_START = "=== STUDIO ===";
export const BLOCK_END = "=== END ===";

type Section = "preamble" | "ignore" | "script" | "cards" | "caption" | "hashtags" | "extraHashtags" | "tags" | "sources" | "notes";
type Meta = "title" | "status" | "format" | "pillar" | "series" | "part" | "cover" | "ignore";

const META: [RegExp, Meta][] = [
  [/^(title|name)$/, "title"],
  [/^status$/, "status"],
  [/^(format|type)$/, "format"],
  [/^(pillar|topic)$/, "pillar"],
  [/^series$/, "series"],
  [/^part$/, "part"],
  [/^cover( url| image| link)?$/, "cover"],
  [/^(length|duration|size|file|voice)$/, "ignore"],
];

const SECTIONS: [RegExp, Section][] = [
  [/^(jeff |voice |the |reel |video )?script$|^voice ?over$|^narration$|^voice script$/, "script"],
  [/^(title )?cards$/, "cards"],
  [/^caption$/, "caption"],
  [/^(instagram|ig)( hashtags| tags)?$/, "hashtags"],
  [/^(tiktok|youtube|yt|tiktok ?(\/|and|&|\+) ?youtube|youtube ?(\/|and|&|\+) ?tiktok)( hashtags| tags)?$|^(long|extra|more|full) (hashtags|tags)$/, "extraHashtags"],
  [/^(hashtags?|tags)$/, "tags"],
  [/^(sources?|references|credits)$/, "sources"],
  [/^(notes?|production notes|what'?s in it|design notes)$/, "notes"],
  [/^(files?|deliverables?|downloads?|outputs?|numbers to know|checks?)$/, "ignore"],
];

const clean = (s: string) => s.replace(/[*_`]/g, "").replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim().toLowerCase();

function classify(label: string): { meta?: Meta; section?: Section } | null {
  const l = clean(label);
  for (const [re, m] of META) if (re.test(l)) return { meta: m };
  for (const [re, s] of SECTIONS) if (re.test(l)) return { section: s };
  return null;
}

const URL_RE = /https?:\/\/[^\s)>\]]+/;

/** Recognise "## Caption", "**Caption**", "Caption:", "**Instagram (5):** #a #b", "Series: X". */
function headerOf(line: string): { meta?: Meta; section?: Section; rest: string } | null {
  let s = line.trim();
  if (!s) return null;
  const hashes = /^#{1,6}\s+/.test(s);
  s = s.replace(/^#{1,6}\s+/, "");
  let label: string;
  let rest = "";
  const bold = s.match(/^(\*\*|__)(.+?)\1\s*:?\s*(.*)$/);
  const colon = s.match(/^([A-Za-z][^:]{0,40}):\s*(.*)$/);
  if (bold) [label, rest] = [bold[2].replace(/:\s*$/, ""), bold[3]];
  else if (colon) [label, rest] = [colon[1], colon[2]];
  else if (hashes) label = s;
  else return null;
  const kind = classify(label);
  if (!kind) return null;
  // Guards against sentences that happen to start with a label.
  if (kind.section === "sources" && rest && !URL_RE.test(rest)) return null;
  if (kind.section && ["script", "caption", "notes", "cards"].includes(kind.section) && rest && !hashes && !bold) return null;
  return { ...kind, rest: rest.trim() };
}

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
export const extractHashtags = (text: string) => Array.from(new Set(text.match(HASHTAG_RE) ?? []));

function pick<T extends string>(value: string, options: readonly T[], synonyms: Record<string, T> = {}): T | undefined {
  const v = clean(value);
  if (!v) return undefined;
  for (const [k, t] of Object.entries(synonyms)) if (v.includes(k)) return t;
  return options.find((o) => v === o || v.startsWith(o) || v.includes(o));
}

const pickStatus = (v: string) =>
  pick(v, STUDIO_STATUSES, { "ready for buffer": "ready", done: "ready", rendered: "ready", scheduled: "ready", published: "posted", live: "posted", draft: "writing" });
const pickFormat = (v: string) => pick(v, STUDIO_FORMATS, { "yt short": "short", shorts: "short", "long form": "youtube", slides: "carousel" });
function pickPillar(v: string): StudioPillar | undefined {
  const c = clean(v);
  const byLabel = STUDIO_PILLARS.find((p) => clean(PILLAR_LABEL[p]) === c || c.startsWith(p));
  return byLabel ?? pick(v, STUDIO_PILLARS, { money: "finance", ai: "tech", psychology: "psych", website: "sites", repo: "repos", sport: "sports" });
}

/** "Prediction Markets · Part 3", "Prediction Markets, Part 3", "Prediction Markets P3". */
function splitSeries(v: string): { title: string; part?: number } {
  const m = v.match(/^(.*?)[\s,·:|-]*\b(?:part|p)\s*#?(\d{1,3})\b.*$/i);
  if (m && m[1].trim()) return { title: m[1].trim(), part: Number(m[2]) };
  return { title: v.trim() };
}

const CARD_LINE = /^\[?\s*(?:title\s+)?cards?\s*:\s*(.*?)\]?\s*$/i;
const splitCards = (v: string) =>
  v
    .split(/\s+\/\s+|\s*\|\s*|\s*;\s*/)
    .map((c) => c.trim())
    .filter(Boolean);

function cleanScriptLine(s: string): string {
  return s
    .replace(/^\s*(?:scene|paragraph|p)\s*\d+\s*[:.)-]\s*/i, "")
    .replace(/\s*\((?:pause|beat|breath)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseScript(lines: Line[]): StudioScene[] {
  const quoted = lines.filter((l) => l.quoted && l.text.trim());
  const src = quoted.length ? quoted.map((l) => ({ ...l, blankBefore: true })) : lines;
  const blocks: string[][] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) blocks.push(cur);
    cur = [];
  };
  for (const l of src) {
    if (!l.text.trim()) {
      flush();
      continue;
    }
    if (quoted.length) flush();
    cur.push(l.text);
  }
  flush();
  // One block with several lines: each line is a scene.
  const groups = blocks.length === 1 && blocks[0].filter((t) => !CARD_LINE.test(t)).length > 1 ? blocks[0].map((t) => [t]) : blocks;
  const scenes: StudioScene[] = [];
  for (const g of groups) {
    const cardLines = g.filter((t) => CARD_LINE.test(t));
    const text = cleanScriptLine(g.filter((t) => !CARD_LINE.test(t)).join(" "));
    const cards = cardLines.flatMap((t) => splitCards(t.match(CARD_LINE)![1]));
    if (text) scenes.push({ text, cards });
    else if (cards.length && scenes.length) scenes[scenes.length - 1].cards = [...(scenes[scenes.length - 1].cards ?? []), ...cards];
  }
  return scenes;
}

function parseSources(lines: Line[]): StudioSource[] {
  const out: StudioSource[] = [];
  for (const l of lines) {
    const t = l.text.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
    if (!t) continue;
    const md = t.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
    if (md) {
      out.push({ title: md[1].trim(), url: md[2] });
      continue;
    }
    const url = t.match(URL_RE)?.[0];
    if (url) {
      const title = t
        .replace(url, "")
        .replace(/[\s:–|(<-]+$|^[\s:–|)>-]+/g, "")
        .replace(/\(\s*\)|<\s*>/g, "")
        .trim();
      let host = url;
      try {
        host = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        /* keep the raw url */
      }
      out.push({ title: title || host, url });
    } else {
      out.push({ title: t });
    }
  }
  return out;
}

function textOf(lines: Line[]): string {
  const quoted = lines.filter((l) => l.quoted);
  const use = quoted.length ? quoted : lines;
  return use
    .map((l) => l.text.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Line = { text: string; quoted: boolean };

function fromJson(raw: string): PastedPiece | null {
  let obj: Record<string, unknown>;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    obj = v as Record<string, unknown>;
  } catch {
    return null;
  }
  const str = (k: string[]) => {
    for (const key of k) if (typeof obj[key] === "string" && (obj[key] as string).trim()) return (obj[key] as string).trim();
    return undefined;
  };
  const tags = (k: string[]) => {
    for (const key of k) {
      const v = obj[key];
      if (Array.isArray(v)) return v.map((t) => (String(t).startsWith("#") ? String(t) : `#${t}`)).join(" ");
      if (typeof v === "string") return extractHashtags(v).join(" ") || v;
    }
    return undefined;
  };
  const out: PastedPiece = {};
  const title = str(["title", "name"]);
  if (title) out.title = title;
  const st = str(["status"]);
  if (st) out.status = pickStatus(st);
  const fm = str(["format", "type"]);
  if (fm) out.format = pickFormat(fm);
  const pl = str(["pillar", "topic"]);
  if (pl) out.pillar = pickPillar(pl);
  const se = str(["series"]);
  if (se) Object.assign(out, (({ title: t, part }) => ({ seriesTitle: t, part }))(splitSeries(se)));
  if (typeof obj.part === "number") out.part = obj.part;
  const sc = obj.script;
  if (typeof sc === "string") out.script = parseScript(sc.split("\n").map((t) => ({ text: t, quoted: false })));
  else if (Array.isArray(sc))
    out.script = sc
      .map((s) => (typeof s === "string" ? { text: s, cards: [] } : { text: String((s as StudioScene).text ?? ""), cards: ((s as StudioScene).cards ?? []).map(String) }))
      .filter((s) => s.text.trim());
  const cap = str(["caption"]);
  if (cap) out.caption = cap;
  const ig = tags(["hashtags", "instagram", "instagramHashtags"]);
  if (ig) out.hashtags = ig;
  const ex = tags(["extraHashtags", "tiktok", "youtube", "tiktokHashtags"]);
  if (ex) out.extraHashtags = ex;
  if (Array.isArray(obj.sources))
    out.sources = obj.sources
      .map((s) => (typeof s === "string" ? parseSources([{ text: s, quoted: false }])[0] : { title: String((s as StudioSource).title ?? ""), url: (s as StudioSource).url }))
      .filter((s): s is StudioSource => Boolean(s && (s.title || s.url)));
  const notes = str(["notes"]);
  if (notes) out.notes = notes;
  const cover = str(["coverUrl", "cover"]);
  if (cover && URL_RE.test(cover)) out.coverUrl = cover;
  return out;
}

export function parseStudioPaste(input: string, known: { seriesTitles?: string[] } = {}): PastedPiece {
  let raw = (input || "").replace(/\r\n?/g, "\n");
  const json = raw.trim().startsWith("{") ? fromJson(raw.trim()) : null;
  const out: PastedPiece = json ?? {};
  if (!json) {
    const a = raw.indexOf(BLOCK_START);
    if (a >= 0) {
      const b = raw.indexOf(BLOCK_END, a);
      raw = raw.slice(a + BLOCK_START.length, b >= 0 ? b : undefined);
    }
    const buckets = new Map<Section, Line[]>();
    let section: Section = "preamble";
    let firstHeading: string | undefined;
    for (const rawLine of raw.split("\n")) {
      const quoted = /^\s*>/.test(rawLine);
      const text = rawLine.replace(/^\s*>\s?/, "");
      const h = quoted ? null : headerOf(text);
      if (h?.meta) {
        const v = h.rest.replace(/^[*_\s]+|[*_\s]+$/g, "");
        if (h.meta === "title" && v) out.title = v;
        else if (h.meta === "status") out.status = pickStatus(v) ?? out.status;
        else if (h.meta === "format") out.format = pickFormat(v) ?? out.format;
        else if (h.meta === "pillar") out.pillar = pickPillar(v) ?? out.pillar;
        else if (h.meta === "series" && v && !/^(none|no|-)$/i.test(v)) {
          const s = splitSeries(v);
          out.seriesTitle = s.title;
          if (s.part) out.part = s.part;
        } else if (h.meta === "part") {
          const n = Number(v.match(/\d+/)?.[0]);
          if (n) out.part = n;
        } else if (h.meta === "cover" && URL_RE.test(v)) out.coverUrl = v.match(URL_RE)![0];
        continue;
      }
      if (h?.section) {
        section = h.section;
        if (h.rest) (buckets.get(section) ?? buckets.set(section, []).get(section)!).push({ text: h.rest, quoted: false });
        else if (!buckets.has(section)) buckets.set(section, []);
        continue;
      }
      if (section === "preamble" && !firstHeading && /^#{1,3}\s+\S/.test(text)) firstHeading = text.replace(/^#+\s+/, "").trim();
      (buckets.get(section) ?? buckets.set(section, []).get(section)!).push({ text, quoted });
    }

    const script = buckets.get("script");
    if (script) {
      const scenes = parseScript(script);
      if (scenes.length) out.script = scenes;
    }
    const cards = buckets.get("cards");
    if (cards && out.script) {
      const rows = cards.map((l) => l.text.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean);
      rows.forEach((row, i) => {
        if (out.script![i]) out.script![i].cards = splitCards(row.replace(/^scene\s*\d+\s*:\s*/i, ""));
      });
    }
    const caption = buckets.get("caption");
    if (caption) {
      let text = textOf(caption);
      // A trailing line of only hashtags belongs in the hashtag fields.
      const lines = text.split("\n");
      const last = lines[lines.length - 1] ?? "";
      if (last.trim() && last.replace(HASHTAG_RE, "").trim() === "" && !buckets.has("hashtags") && !buckets.has("tags")) {
        buckets.set("tags", [{ text: last, quoted: false }]);
        text = lines.slice(0, -1).join("\n").trim();
      }
      if (text) out.caption = text;
    }
    const ig = buckets.get("hashtags");
    if (ig) {
      const t = extractHashtags(ig.map((l) => l.text).join(" "));
      if (t.length) out.hashtags = t.join(" ");
    }
    const ex = buckets.get("extraHashtags");
    if (ex) {
      const t = extractHashtags(ex.map((l) => l.text).join(" "));
      if (t.length) out.extraHashtags = t.join(" ");
    }
    const tags = buckets.get("tags");
    if (tags) {
      const t = extractHashtags(tags.map((l) => l.text).join(" "));
      if (t.length) {
        if (!out.hashtags) out.hashtags = t.slice(0, 5).join(" ");
        if (!out.extraHashtags && t.length > 5) out.extraHashtags = t.join(" ");
      }
    }
    const sources = buckets.get("sources");
    if (sources) {
      const s = parseSources(sources);
      if (s.length) out.sources = s;
    }
    const notes = buckets.get("notes");
    if (notes) {
      const t = textOf(notes);
      if (t) out.notes = t;
    }
    if (!out.title && firstHeading) out.title = firstHeading.replace(/[*_]/g, "");
  }

  // Series named inside the title or anywhere in the text, when it's one you already have.
  if (!out.seriesTitle && known.seriesTitles?.length) {
    const hay = `${out.title ?? ""}\n${input}`;
    for (const t of [...known.seriesTitles].sort((a, b) => b.length - a.length)) {
      const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = hay.match(new RegExp(`${esc}\\W{0,6}(?:part|p)\\s*#?(\\d{1,3})\\b`, "i"));
      if (m) {
        out.seriesTitle = t;
        out.part = Number(m[1]);
        break;
      }
    }
  }
  if (out.hashtags) out.hashtags = extractHashtags(out.hashtags).join(" ") || out.hashtags;
  (Object.keys(out) as (keyof PastedPiece)[]).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Find a series by title: exact first, then one title containing the other. */
export function matchSeries<T extends { title: string }>(list: T[], title: string | undefined): T | null {
  if (!title) return null;
  const k = norm(title);
  if (!k) return null;
  return list.find((s) => norm(s.title) === k) ?? list.find((s) => norm(s.title).includes(k) || k.includes(norm(s.title))) ?? null;
}

/** Where a paste should land: the piece already in that series part, else a piece with the same title. */
export function matchPiece<P extends { id: string; title: string; seriesId: string | null; part: number | null }>(
  pieces: P[],
  series: { id: string; parts: { n: number; pieceId?: string | null }[] } | null,
  pasted: PastedPiece
): P | null {
  if (series && pasted.part) {
    const slot = series.parts.find((p) => p.n === pasted.part && p.pieceId);
    const bySlot = slot ? pieces.find((p) => p.id === slot.pieceId) : undefined;
    if (bySlot) return bySlot;
    const byPart = pieces.find((p) => p.seriesId === series.id && p.part === pasted.part);
    if (byPart) return byPart;
  }
  if (pasted.title) {
    const k = norm(pasted.title);
    const byTitle = pieces.find((p) => norm(p.title) === k);
    if (byTitle) return byTitle;
  }
  return null;
}

/** The piece fields a paste will write, limited to the ticked fields. */
export function pastePatch(pasted: PastedPiece, fields: Iterable<PasteField>): Partial<StudioPiece> {
  const patch: Partial<StudioPiece> = {};
  const set = new Set(fields);
  if (set.has("title") && pasted.title) patch.title = pasted.title;
  if (set.has("status") && pasted.status) patch.status = pasted.status;
  if (set.has("format") && pasted.format) patch.format = pasted.format;
  if (set.has("pillar") && pasted.pillar) patch.pillar = pasted.pillar;
  if (set.has("script") && pasted.script) patch.script = pasted.script;
  if (set.has("caption") && pasted.caption !== undefined) patch.caption = pasted.caption;
  if (set.has("hashtags") && pasted.hashtags !== undefined) patch.hashtags = pasted.hashtags;
  if (set.has("extraHashtags") && pasted.extraHashtags !== undefined) patch.extraHashtags = pasted.extraHashtags;
  if (set.has("sources") && pasted.sources) patch.sources = pasted.sources;
  if (set.has("notes") && pasted.notes !== undefined) patch.notes = pasted.notes;
  if (set.has("coverUrl") && pasted.coverUrl) patch.coverUrl = pasted.coverUrl;
  return patch;
}

/** Write a piece as a Studio block, the same format the paste box reads. */
export function toStudioBlock(
  piece: Pick<StudioPiece, "title" | "status" | "format" | "pillar" | "part" | "script" | "caption" | "hashtags" | "extraHashtags" | "sources" | "notes" | "coverUrl">,
  seriesTitle?: string | null
): string {
  const L: string[] = [BLOCK_START, `Title: ${piece.title}`];
  if (seriesTitle) L.push(`Series: ${seriesTitle}`, `Part: ${piece.part ?? ""}`);
  L.push(`Format: ${piece.format}`, `Topic: ${piece.pillar}`, `Status: ${piece.status}`);
  if (piece.coverUrl) L.push(`Cover: ${piece.coverUrl}`);
  L.push("", "## Script");
  for (const s of piece.script) {
    if (!(s.text || "").trim()) continue;
    L.push(s.text.trim());
    const cards = (s.cards ?? []).filter(Boolean);
    if (cards.length) L.push(`[cards: ${cards.join(" / ")}]`);
    L.push("");
  }
  L.push("## Caption", piece.caption.trim(), "", "## Instagram hashtags", piece.hashtags.trim());
  if (piece.extraHashtags.trim()) L.push("", "## TikTok / YouTube hashtags", piece.extraHashtags.trim());
  if (piece.sources.length) L.push("", "## Sources", ...piece.sources.map((s) => (s.url ? `- [${s.title}](${s.url})` : `- ${s.title}`)));
  if (piece.notes.trim()) L.push("", "## Notes", piece.notes.trim());
  L.push(BLOCK_END);
  return L.join("\n");
}

/** Shown in the paste box and appended to the production brief, so Claude replies in this shape. */
export const STUDIO_BLOCK_TEMPLATE = [
  BLOCK_START,
  "Title: <piece title>",
  "Series: <series name>        (leave out if standalone)",
  "Part: <number>",
  "Format: reel | carousel | youtube | short",
  "Topic: finance | sports | tech | world | concepts | psych | sites | tools | repos",
  "Status: writing | recording | making | ready | posted",
  "",
  "## Script",
  "<scene 1 text>",
  "[cards: TITLE CARD / TITLE CARD]",
  "",
  "<scene 2 text>",
  "",
  "## Caption",
  "<caption>",
  "",
  "## Instagram hashtags",
  "#five #tags #max",
  "",
  "## TikTok / YouTube hashtags",
  "#the #longer #set",
  "",
  "## Sources",
  "- [Title](https://link)",
  "",
  "## Notes",
  "<anything else>",
  BLOCK_END,
].join("\n");

/**
 * Infer primary Studio pillar from series/parts text based on keywords.
 */
export function inferPillarFromContent(text: string): StudioPillar {
  const lower = text.toLowerCase();
  if (/(?:cartoon|anime|show|character|nostalgia|childhood|pokemon|dragon ball|disney|movie|series|super saiyan|power rangers|hero|comic)/i.test(lower)) return "world";
  if (/(?:money|invest|stock|crypto|bitcoin|finance|fund|trade|wealth|dollar|revenue|profit|economy|market)/i.test(lower)) return "finance";
  if (/(?:code|programming|github|software|developer|ai|model|llm|tech|app|database|api|agent)/i.test(lower)) return "tech";
  if (/(?:nba|football|soccer|cricket|f1|tennis|athlete|olympic|world cup|championship|sport)/i.test(lower)) return "sports";
  if (/(?:psychology|brain|mental|habit|dopamine|sleep|adhd|focus|bias|mindset)/i.test(lower)) return "psych";
  if (/(?:website|landing page|ui|ux|design|css|figma)/i.test(lower)) return "sites";
  return "world";
}

function parseSeriesFromJson(raw: string): PastedSeries | null {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v) && v.length >= 2) {
      const parts: PastedSeriesPart[] = [];
      v.forEach((item: Record<string, unknown>, idx: number) => {
        if (typeof item === "object" && item) {
          const title = String(item.title || item.name || `Part ${idx + 1}`);
          const scriptText = typeof item.script === "string" ? item.script : typeof item.content === "string" ? item.content : "";
          const hook = typeof item.hook === "string" ? item.hook : undefined;
          const scenes = parseScript((scriptText || "").split("\n").map((t: string) => ({ text: t, quoted: false })));
          parts.push({
            n: typeof item.part === "number" ? item.part : idx + 1,
            title,
            hook,
            script: scenes.length ? scenes : undefined,
            rawText: scriptText || title,
          });
        }
      });
      if (parts.length >= 2) {
        return {
          title: `Imported Series (${parts.length} Parts)`,
          parts,
          pillar: inferPillarFromContent(raw),
          format: "reel",
        };
      }
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const seriesTitle = typeof v.title === "string" ? v.title : typeof v.series === "string" ? v.series : undefined;
      const arr = Array.isArray(v.parts) ? v.parts : Array.isArray(v.episodes) ? v.episodes : Array.isArray(v.pieces) ? v.pieces : null;
      if (arr && arr.length >= 2) {
        const parts: PastedSeriesPart[] = (arr as Record<string, unknown>[]).map((item, idx) => {
          const title = String(item.title || item.name || `Part ${idx + 1}`);
          const scriptText = typeof item.script === "string" ? item.script : typeof item.content === "string" ? item.content : "";
          const scenes = parseScript((scriptText || "").split("\n").map((t: string) => ({ text: t, quoted: false })));
          return {
            n: typeof item.part === "number" ? item.part : idx + 1,
            title,
            hook: typeof item.hook === "string" ? item.hook : undefined,
            script: scenes.length ? scenes : undefined,
            rawText: scriptText || title,
          };
        });
        return {
          title: seriesTitle || `Imported Series (${parts.length} Parts)`,
          theme: typeof v.theme === "string" ? v.theme : undefined,
          parts,
          pillar: inferPillarFromContent(raw),
          format: "reel",
        };
      }
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Match a line that denotes the start of an episode or part within a series.
 * Supports:
 * - Markdown headings: "### 1. 👽 Ben 10", "## Part 1: Ben 10", "# Episode 2 - Goku", "### 1: Ben 10"
 * - Bold headings: "**Part 1: Ben 10**", "**1. 👽 Ben 10**"
 * - Plain prefixes: "Part 1: Ben 10", "Episode 1 - Ben 10", "Ep 1: Ben 10"
 * - Bracketed: "[Part 1] Ben 10", "[Episode 1: Ben 10]"
 * - Numbered items: "1. 👽 Ben 10", "1) Ben 10"
 */
function matchPartHeader(line: string): { n?: number; title: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Skip dividers
  if (/^[-*=_]{3,}$/.test(trimmed)) return null;

  // Skip reserved studio keywords when they look like section labels
  if (/^#{1,6}\s*(?:script|caption|instagram|tiktok|youtube|hashtags|tags|sources|notes|scene)\b/i.test(trimmed)) return null;

  // 1. Markdown heading with optional part keyword and number:
  // e.g. "### 1. 👽 Ben 10", "## Part 1: Ben 10", "# Episode 2 - Goku", "### 1: Ben 10", "## 10. 🔵 Doraemon"
  const mdMatch = trimmed.match(/^#{1,4}\s*(?:(?:\*\*|__)?\s*(?:part|episode|ep|p|day|tip|step|vol|volume|video)\s*#?\s*)?(\d+)[.:)\s-]+(.*?)(?:\*\*|__)?$/i);
  if (mdMatch) {
    const n = Number(mdMatch[1]);
    const rawTitle = mdMatch[2].replace(/^[:.\s-]+/, "").trim();
    return { n, title: rawTitle || `Part ${n}` };
  }

  // 2. Markdown heading with explicit Part/Episode prefix:
  // e.g. "## Part: Ben 10", "### Episode - Goku"
  const mdPartPrefix = trimmed.match(/^#{1,4}\s*(?:part|episode|ep)\s*[:.\s-]+(.*)$/i);
  if (mdPartPrefix && mdPartPrefix[1].trim()) {
    return { title: mdPartPrefix[1].trim() };
  }

  // 3. Bold text line with Part/Episode or Number:
  // e.g. "**Part 1: Ben 10**", "**1. 👽 Ben 10**", "__Episode 2: Power Rangers__"
  const boldMatch = trimmed.match(/^(?:\*\*|__)\s*(?:(?:part|episode|ep|p|day|tip|step|video)\s*#?\s*)?(\d+)[.:)\s-]+(.*?)(?:\*\*|__)$/i);
  if (boldMatch) {
    const n = Number(boldMatch[1]);
    const rawTitle = boldMatch[2].replace(/^[:.\s-]+/, "").trim();
    return { n, title: rawTitle || `Part ${n}` };
  }

  // 4. Plain line starting with Part / Episode / Ep / Day / Video:
  // e.g. "Part 1: Ben 10", "Episode 1 - Ben 10", "Ep 1: Ben 10", "Part 1. Ben 10"
  const prefixMatch = trimmed.match(/^(?:part|episode|ep|day|tip|step|video)\s*#?\s*(\d+)[:.\s-]+(.*)$/i);
  if (prefixMatch) {
    const n = Number(prefixMatch[1]);
    const rawTitle = prefixMatch[2].replace(/^[:.\s-]+/, "").trim();
    return { n, title: rawTitle || `Part ${n}` };
  }

  // 5. Bracketed header:
  // e.g. "[Part 1] Ben 10", "[Episode 1: Ben 10]", "[EP 1] Ben 10"
  const bracketMatch = trimmed.match(/^\[\s*(?:part|episode|ep|p)\s*#?\s*(\d+)(?:[:.\s-]+(.*?))?\]\s*(.*)$/i);
  if (bracketMatch) {
    const n = Number(bracketMatch[1]);
    const rawTitle = (bracketMatch[2] || bracketMatch[3] || "").trim();
    return { n, title: rawTitle || `Part ${n}` };
  }

  // 6. Numbered item: "1. 👽 Ben 10" or "1) Ben 10"
  const numListMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
  if (numListMatch) {
    const n = Number(numListMatch[1]);
    const title = numListMatch[2].trim();
    if (title && title.length < 80 && !/[.!?]$/.test(title)) {
      return { n, title };
    }
  }

  return null;
}

/**
 * Automatically detect and parse a multi-part series from pasted text, outlines,
 * scripts, markdown headings, or JSON.
 * Returns null if the text does not contain multiple parts/episodes.
 */
export function parseSeriesPaste(input: string): PastedSeries | null {
  if (!input || typeof input !== "string") return null;
  const raw = input.replace(/\r\n?/g, "\n");

  // Check JSON first
  const fromJsonResult = raw.trim().startsWith("[") || raw.trim().startsWith("{") ? parseSeriesFromJson(raw.trim()) : null;
  if (fromJsonResult) return fromJsonResult;

  const lines = raw.split("\n");
  let declaredTitle: string | undefined;
  const preambleLines: string[] = [];
  const rawParts: { n?: number; title: string; lines: string[] }[] = [];
  let currentPart: { n?: number; title: string; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for explicit Series header before any parts are encountered
    if (!currentPart && rawParts.length === 0) {
      const seriesHeaderMatch = trimmed.match(/^(?:#+\s*)?(?:(?:\*\*|__)?\s*)?(?:series|show|playlist)\s*:\s*(.*?)(?:\*\*|__)?$/i);
      if (seriesHeaderMatch) {
        const val = seriesHeaderMatch[1].trim();
        if (val) declaredTitle = val;
        continue;
      }
    }

    const header = matchPartHeader(line);
    if (header) {
      if (currentPart) {
        rawParts.push(currentPart);
      }
      currentPart = {
        n: header.n,
        title: header.title,
        lines: [],
      };
      continue;
    }

    if (currentPart) {
      // Filter out markdown divider lines
      if (!/^[-*=_]{3,}$/.test(trimmed)) {
        currentPart.lines.push(line);
      }
    } else {
      if (!/^[-*=_]{3,}$/.test(trimmed)) {
        preambleLines.push(line);
      }
    }
  }

  if (currentPart) {
    rawParts.push(currentPart);
  }

  // If fewer than 2 parts were found via line scanning, check if divided by horizontal rules
  if (rawParts.length < 2) {
    const dividerSections = raw.split(/\n\s*[-*=_]{3,}\s*\n/);
    if (dividerSections.length >= 2) {
      const candidateParts: { n?: number; title: string; lines: string[] }[] = [];
      for (let sIdx = 0; sIdx < dividerSections.length; sIdx++) {
        const sec = dividerSections[sIdx].trim();
        if (!sec) continue;
        const secLines = sec.split("\n");
        const firstLine = secLines[0].trim();
        const header = matchPartHeader(firstLine);
        if (header) {
          candidateParts.push({ n: header.n ?? candidateParts.length + 1, title: header.title, lines: secLines.slice(1) });
        } else if (/^#{1,3}\s+(.+)$/.test(firstLine)) {
          const t = firstLine.replace(/^#{1,3}\s+/, "").trim();
          candidateParts.push({ n: candidateParts.length + 1, title: t, lines: secLines.slice(1) });
        }
      }
      if (candidateParts.length >= 2) {
        rawParts.length = 0;
        rawParts.push(...candidateParts);
      }
    }
  }

  if (rawParts.length < 2) return null;

  // Process and standardize each part
  const parts: PastedSeriesPart[] = rawParts.map((rp, idx) => {
    const n = rp.n ?? idx + 1;
    const rawText = rp.lines.join("\n").trim();
    
    // Extract video hook (look for quotes, bold, or opening line)
    let hook: string | undefined;
    const quoteMatch = rawText.match(/[“"']([^"”\n]{10,180})[”"']/);
    if (quoteMatch) {
      hook = quoteMatch[1].trim();
    } else {
      const boldMatch = rawText.match(/\*\*([^*\n]{10,180})\*\*/);
      if (boldMatch) hook = boldMatch[1].trim();
      else {
        const firstNonEmpty = rp.lines.find((l) => l.trim().length > 0)?.trim();
        if (firstNonEmpty && firstNonEmpty.length < 140) hook = firstNonEmpty.replace(/[*_]/g, "");
      }
    }

    // Split paragraphs into scenes
    const paragraphs = rawText.split(/\n\s*\n+/);
    const scenes: StudioScene[] = [];
    for (const para of paragraphs) {
      const cleanPara = para
        .replace(/^>+\s*/, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleanPara) continue;
      const text = cleanScriptLine(cleanPara);
      if (text) scenes.push({ text, cards: [] });
    }

    const summary = rawText
      .replace(/[“"”*_`#]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 140)
      .trim();

    return {
      n,
      title: rp.title.replace(/^[*_]+|[*_]+$/g, "").trim(),
      hook,
      summary,
      script: scenes.length ? scenes : undefined,
      rawText,
    };
  });

  // Re-number parts sequentially if needed
  parts.sort((a, b) => a.n - b.n);

  // Determine series title
  let title = declaredTitle;
  if (!title) {
    // Check preamble for heading
    const headingInPreamble = preambleLines.find((l) => /^#{1,3}\s+\S/.test(l.trim()));
    if (headingInPreamble) {
      title = headingInPreamble.replace(/^#{1,3}\s+/, "").replace(/[*_]/g, "").trim();
    }
  }

  if (!title) {
    // Clean name of first part
    const cleanFirst = parts[0].title.replace(/^[^\p{L}\p{N}\s]+/gu, "").trim();
    title = cleanFirst ? `${cleanFirst} & ${parts.length - 1} more` : `Series (${parts.length} Parts)`;
  }

  const pillar = inferPillarFromContent(raw);

  return {
    title,
    parts,
    pillar,
    format: "reel",
  };
}
