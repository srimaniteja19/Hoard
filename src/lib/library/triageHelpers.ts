import { z } from "zod";
import { inferItemType, type ItemType } from "@/lib/library/inferItemType";
import type { Collection, KindType } from "@/types";

export const triageSchema = z.object({
  tags: z.array(z.string()).max(5),
  suggestedCollection: z.string(),
  itemType: z.enum(["REFERENCE", "QUEUED"]),
  summary: z.string().max(160),
});

export interface GistTopicSummary {
  slug: string;
  name: string;
  score: number;
  tag: string;
}

export type CaptureTriage = z.infer<typeof triageSchema> & {
  gistTopics?: GistTopicSummary[];
};

export type NamedCollection = { id: string; name: string; depth?: number };

export function flattenCollections(list: Collection[], depth = 0): NamedCollection[] {
  let res: NamedCollection[] = [];
  for (const item of list) {
    if (item.id !== "all") {
      res.push({ id: item.id, name: item.name, depth });
    }
    if (item.kids) res = res.concat(flattenCollections(item.kids, depth + 1));
  }
  return res;
}

const TAG_FALLBACK = "general";

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function primaryTag(tags: string[]): string {
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (normalized) return normalized;
  }
  return TAG_FALLBACK;
}

export function matchSuggestedCollection(
  suggested: string,
  collections: NamedCollection[],
  fallbackId: string
): string {
  const needle = suggested.trim().toLowerCase();
  if (!needle) return fallbackId;
  const byId = collections.find((c) => c.id.toLowerCase() === needle);
  if (byId) return byId.id;
  const byName = collections.find((c) => c.name.trim().toLowerCase() === needle);
  if (byName) return byName.id;
  return fallbackId;
}

export function fallbackTriage(input: {
  kind: KindType;
  title?: string | null;
  description?: string | null;
  collections: NamedCollection[];
}): CaptureTriage {
  const fallbackId = input.collections[0]?.id ?? "unsorted";
  const summary = (input.description || input.title || "Saved to the library.").replace(/\s+/g, " ").trim();
  return {
    tags: [input.kind.toLowerCase()],
    suggestedCollection: fallbackId,
    itemType: inferItemType(input.kind),
    summary: summary.slice(0, 160),
  };
}

export function resolvedItemType(triage: CaptureTriage): ItemType {
  return triage.itemType;
}

