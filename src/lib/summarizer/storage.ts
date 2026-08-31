import { DigestResult } from "./types";

export interface SavedDigestItem {
  id: string;
  title: string;
  thesis: string;
  readMinutes: number;
  tags: string[];
  savedAt: string;
  digest: DigestResult;
  sourcePreview: string;
}

const STORAGE_KEY = "hoard_saved_synthesized_digests_v1";

/**
 * Auto-infers candidate tags from a digest's title, thesis, and terms
 */
export function inferDigestTags(digest: DigestResult): string[] {
  const tags = new Set<string>();
  const text = `${digest.title} ${digest.thesis} ${(digest.terms || []).map((t) => t.term).join(" ")}`.toLowerCase();

  if (text.includes("ai") || text.includes("model") || text.includes("learning") || text.includes("llm") || text.includes("neural") || text.includes("transformer")) {
    tags.add("AI");
  }
  if (text.includes("finance") || text.includes("option") || text.includes("stock") || text.includes("market") || text.includes("hedg") || text.includes("risk")) {
    tags.add("FINANCE");
  }
  if (text.includes("physics") || text.includes("light") || text.includes("lithograph") || text.includes("quantum") || text.includes("nanometer") || text.includes("plasma")) {
    tags.add("PHYSICS");
  }
  if (text.includes("hardware") || text.includes("semiconductor") || text.includes("chip") || text.includes("robot") || text.includes("manufacturing")) {
    tags.add("HARDWARE");
  }
  if (text.includes("transcript") || text.includes("interview") || text.includes("podcast") || text.includes("host") || text.includes("speaker")) {
    tags.add("TRANSCRIPT");
  }
  if (text.includes("paper") || text.includes("thesis") || text.includes("equation") || text.includes("math")) {
    tags.add("MATH & THEORY");
  }
  if (text.includes("engineering") || text.includes("software") || text.includes("pipeline") || text.includes("system") || text.includes("architecture")) {
    tags.add("ENGINEERING");
  }

  if (tags.size === 0) {
    tags.add("GENERAL");
  }

  return Array.from(tags);
}

/**
 * Load all saved digests from storage
 */
export function getSavedDigests(): SavedDigestItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to load saved digests:", err);
    return [];
  }
}

/**
 * Save a new digest or update an existing one
 */
export function saveDigest(digest: DigestResult, customTags?: string[], sourceText?: string): SavedDigestItem {
  const items = getSavedDigests();
  const existingIndex = items.findIndex((i) => i.digest.title === digest.title || i.digest.thesis === digest.thesis);

  const tags = customTags && customTags.length > 0 ? customTags : inferDigestTags(digest);
  const sourcePreview = sourceText ? sourceText.slice(0, 200) + "…" : digest.sections[0]?.paragraphs[0]?.slice(0, 200) || "";

  const item: SavedDigestItem = {
    id: existingIndex >= 0 ? items[existingIndex].id : `digest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: digest.title,
    thesis: digest.thesis,
    readMinutes: digest.readMinutes,
    tags,
    savedAt: new Date().toISOString(),
    digest,
    sourcePreview,
  };

  if (existingIndex >= 0) {
    items[existingIndex] = item;
  } else {
    items.unshift(item);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save digest to storage:", err);
  }

  return item;
}

/**
 * Delete a saved digest by ID
 */
export function deleteSavedDigest(id: string): SavedDigestItem[] {
  const items = getSavedDigests().filter((i) => i.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to delete digest:", err);
  }
  return items;
}

/**
 * Update tags for a saved digest
 */
export function updateDigestTags(id: string, tags: string[]): SavedDigestItem[] {
  const items = getSavedDigests().map((item) => {
    if (item.id === id) {
      return { ...item, tags };
    }
    return item;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to update tags:", err);
  }
  return items;
}
