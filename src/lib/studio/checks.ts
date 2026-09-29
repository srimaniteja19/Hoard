import type { StudioPiece, StudioScene } from "./types";
import { FORMAT_LABEL, HOUSE_RULES } from "./types";

export type CheckLevel = "ok" | "warn" | "info";
export interface Check {
  level: CheckLevel;
  text: string;
}

const EM_DASH = /—/;
const FOLLOW = /follow and share/i;

export function splitSentences(text: string): string[] {
  return (text || "")
    .trim()
    .split(/(?<=[.?!])\s+/)
    .filter(Boolean);
}

export function scriptText(script: StudioScene[]): string {
  return script.map((s) => s.text || "").join(" ");
}

/** Rough spoken length: 165 words a minute, half a second per scene break, a second per "pause and guess". */
export function estimateSeconds(script: StudioScene[], wpm = 165): { words: number; seconds: number } {
  const text = scriptText(script);
  const words = text.split(/\s+/).filter(Boolean).length;
  const scenes = script.filter((s) => (s.text || "").trim()).length;
  const pauses = (text.match(/pause and guess/gi) || []).length;
  return { words, seconds: (words / wpm) * 60 + scenes * 0.5 + pauses };
}

export function scriptChecks(piece: Pick<StudioPiece, "script" | "format">): Check[] {
  const text = scriptText(piece.script);
  const { words, seconds } = estimateSeconds(piece.script);
  const out: Check[] = [{ level: "info", text: `${words} words · about ${Math.round(seconds)}s` }];
  if (piece.format === "reel" || piece.format === "short") {
    out.push(seconds >= 45 && seconds <= 60 ? { level: "ok", text: "45 to 60s" } : { level: "warn", text: "Aim for 45 to 60s" });
  }
  if (piece.format === "youtube") {
    out.push(seconds >= 180 && seconds <= 300 ? { level: "ok", text: "3 to 5 min" } : { level: "warn", text: "Aim for 3 to 5 min" });
  }
  out.push(EM_DASH.test(text) ? { level: "warn", text: "Remove em dashes" } : { level: "ok", text: "No em dashes" });
  if (piece.format !== "carousel") {
    out.push(FOLLOW.test(text) ? { level: "ok", text: "Follow and share line" } : { level: "warn", text: "Add the follow and share line" });
  }
  return out;
}

export function parseHashtags(raw: string): string[] {
  return (raw || "")
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

export function captionChecks(piece: Pick<StudioPiece, "caption" | "hashtags">): Check[] {
  const caption = piece.caption || "";
  const tags = parseHashtags(piece.hashtags);
  const out: Check[] = [{ level: "info", text: `${caption.length.toLocaleString()} / 2,200 characters` }];
  out.push(tags.length <= 5 ? { level: "ok", text: `${tags.length} hashtags` } : { level: "warn", text: `${tags.length} hashtags, Instagram allows 5` });
  if (caption) {
    out.push(FOLLOW.test(caption) ? { level: "ok", text: "Follow and share line" } : { level: "warn", text: "Add the follow and share line" });
  }
  if (EM_DASH.test(caption)) out.push({ level: "warn", text: "Remove em dashes" });
  return out;
}

/** Caption plus up to five hashtags, ready to paste into Buffer. */
export function bufferText(piece: Pick<StudioPiece, "caption" | "hashtags">): string {
  const tags = parseHashtags(piece.hashtags).slice(0, 5).join(" ");
  return [piece.caption.trim(), tags].filter(Boolean).join("\n\n");
}

/** The script as Jeff should read it, with a spoken pause after "Pause and guess". */
export function voiceScript(script: StudioScene[]): string {
  return script
    .map((s) =>
      splitSentences(s.text)
        .map((t) => (/^pause and guess/i.test(t) ? `${t} (pause about 1 second)` : t))
        .join(" ")
    )
    .filter(Boolean)
    .join("\n\n");
}

const FORMAT_SPEC: Record<string, string> = {
  reel: " (45 to 60s, 1080x1920, under 12 MB, cover inside the first 0.6s and separate)",
  short: " (under 60s, 1080x1920)",
  youtube: " (3 to 5 min, 16:9)",
  carousel: " (7 to 8 slides)",
};

/** A paste-ready production brief for making the piece with Claude. */
export function productionBrief(
  piece: Pick<StudioPiece, "title" | "format" | "script" | "sources" | "notes" | "part">,
  series?: { title: string; theme: string } | null
): string {
  const lines = [`# ${piece.title}`, "", `Format: ${FORMAT_LABEL[piece.format] ?? piece.format}${FORMAT_SPEC[piece.format] ?? ""}`];
  if (series) lines.push(`Series: ${series.title}, Part ${piece.part ?? "?"}${series.theme ? `, keep the ${series.theme} theme` : ""}`);
  lines.push("", "## Script");
  piece.script.forEach((s, i) => {
    if (!(s.text || "").trim()) return;
    lines.push("", `Scene ${i + 1}: ${s.text}`);
    const cards = (s.cards || []).filter(Boolean);
    if (cards.length) lines.push(`Title cards: ${cards.join(" / ")}`);
  });
  lines.push("", "## House rules", ...HOUSE_RULES.map((r) => `- ${r}`));
  if (piece.sources.length) lines.push("", "## Sources", ...piece.sources.map((s) => `- ${s.title}${s.url ? `: ${s.url}` : ""}`));
  if (piece.notes.trim()) lines.push("", "## Notes", piece.notes.trim());
  lines.push("", "Deliver: the video with the cover inside plus the cover separately, a caption with up to 5 hashtags, sources, and the voice script.");
  return lines.join("\n");
}
