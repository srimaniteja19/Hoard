import type { LinkDensity } from "@/lib/validations/til";

export type ClipLink = { title: string; url: string };

export type ClipImportResult = {
  items: ClipLink[];
  dropped: number;
};

export type ClipTilDraft = {
  type: "LINK";
  body: string;
  linkUrl: string;
  linkDensity: LinkDensity;
  tags: string[];
  saveToHoardQueue: false;
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function coerceClipLink(value: unknown): ClipLink | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.title !== "string" || typeof rec.url !== "string") return null;
  const title = rec.title.trim();
  const url = rec.url.trim();
  if (!title || !isHttpUrl(url)) return null;
  return { title, url };
}

export function parseClipImport(text: string): ClipImportResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const rawItems = Array.isArray(parsed) ? parsed : [parsed];
  const items: ClipLink[] = [];
  let dropped = 0;
  for (const raw of rawItems) {
    const link = coerceClipLink(raw);
    if (link) items.push(link);
    else dropped++;
  }

  if (items.length === 0) return null;
  return { items, dropped };
}

export function densityForUrl(url: string): LinkDensity {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host === "vimeo.com" ||
      host.endsWith(".vimeo.com")
    ) {
      return "full";
    }
  } catch {
    // fall through to card
  }
  return "card";
}

export function clipLinksToTilDrafts(items: ClipLink[]): ClipTilDraft[] {
  return items.map((item) => ({
    type: "LINK",
    body: item.title,
    linkUrl: item.url,
    linkDensity: densityForUrl(item.url),
    tags: [],
    saveToHoardQueue: false,
  }));
}
