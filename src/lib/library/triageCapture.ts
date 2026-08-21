import { z } from "zod";
import { generateText, Output } from "ai";
import { inferItemType, type ItemType } from "@/lib/library/inferItemType";
import type { Collection, KindType } from "@/types";
import { TRIAGE_MODEL } from "@/lib/ai/models";

export const triageSchema = z.object({
  tags: z.array(z.string()).max(5),
  suggestedCollection: z.string(),
  itemType: z.enum(["REFERENCE", "QUEUED"]),
  summary: z.string().max(160),
});

export type CaptureTriage = z.infer<typeof triageSchema>;

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

function collectionPrompt(collections: NamedCollection[]): string {
  if (collections.length === 0) return "Unsorted";
  return collections.map((c) => `${c.name} [${c.id}]`).join("; ");
}

export async function triageCapture(input: {
  url: string;
  title?: string | null;
  description?: string | null;
  kind: KindType;
  collections: NamedCollection[];
}): Promise<CaptureTriage> {
  const fallback = fallbackTriage(input);
  const fallbackId = fallback.suggestedCollection;

  try {
    const result = await generateText({
      model: TRIAGE_MODEL,
      output: Output.object({
        schema: triageSchema,
        name: "CaptureTriage",
        description: "Pre-fill metadata for a saved library item",
      }),
      timeout: { totalMs: 8000 },
      prompt: `Classify this saved item for a personal reference library.

URL: ${input.url}
Title: ${input.title || "(none)"}
Description: ${input.description || "(none)"}
Detected kind: ${input.kind}

Existing collections (pick one by name or id): ${collectionPrompt(input.collections)}

Rules:
- tags: 1-3 short topical slugs (no #), specific not generic.
- suggestedCollection: must be one of the collections listed, or Unsorted.
- itemType: REFERENCE if the person will return to it (docs, repos, tools, playlists). QUEUED if it is a one-time read/watch (articles, videos, papers).
- summary: one line, max 160 chars, what this is and why it might matter. No marketing fluff.`,
    });

    const output = result.output;
    if (!output) return fallback;

    return {
      tags: output.tags.length > 0 ? output.tags.map(normalizeTag).filter(Boolean) : fallback.tags,
      suggestedCollection: matchSuggestedCollection(
        output.suggestedCollection,
        input.collections,
        fallbackId
      ),
      itemType: output.itemType,
      summary: output.summary.trim().slice(0, 160) || fallback.summary,
    };
  } catch (e) {
    console.error("[triageCapture]", e);
    return fallback;
  }
}

export function resolvedItemType(triage: CaptureTriage): ItemType {
  return triage.itemType;
}
