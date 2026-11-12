import { generateText, Output } from "ai";
import type { KindType } from "@/types";
import { TRIAGE_MODEL, gatewayProviderOptions, languageModel } from "@/lib/ai/models";
import { suggestTagsFromContent } from "@/lib/gist/service";
import {
  triageSchema,
  flattenCollections,
  normalizeTag,
  primaryTag,
  matchSuggestedCollection,
  fallbackTriage,
  resolvedItemType,
  type CaptureTriage,
  type NamedCollection,
} from "./triageHelpers";

export {
  triageSchema,
  flattenCollections,
  normalizeTag,
  primaryTag,
  matchSuggestedCollection,
  fallbackTriage,
  resolvedItemType,
  type CaptureTriage,
  type NamedCollection,
};

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

  // Run on-device Gist topic classification concurrently (fast ~10ms pass)
  const gistPromise = suggestTagsFromContent({
    title: input.title,
    content: input.description,
    url: input.url,
    topK: 4,
  }).catch(() => ({ topics: [], tags: [] }));

  try {
    const [result, gistResult] = await Promise.all([
      generateText({
        model: languageModel(TRIAGE_MODEL),
        output: Output.object({
          schema: triageSchema,
          name: "CaptureTriage",
          description: "Pre-fill metadata for a saved library item",
        }),
        timeout: { totalMs: 8000 },
        maxRetries: 0,
        providerOptions: gatewayProviderOptions(TRIAGE_MODEL, ["feature:capture-triage"]),
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
      }).catch((err) => {
        console.warn("[triageCapture] LLM generation failed or timed out:", err);
        return null;
      }),
      gistPromise,
    ]);

    const output = result?.output;
    const resolvedGistTags = gistResult.tags.length > 0 ? gistResult.tags : fallback.tags;

    if (!output) {
      return {
        ...fallback,
        tags: resolvedGistTags,
        gistTopics: gistResult.topics,
      };
    }

    // Prefer LLM tags if returned, otherwise use Gist tags
    const normalizedLlmTags = output.tags.map(normalizeTag).filter(Boolean);
    const finalTags = normalizedLlmTags.length > 0 ? normalizedLlmTags : resolvedGistTags;

    return {
      tags: finalTags,
      suggestedCollection: matchSuggestedCollection(
        output.suggestedCollection,
        input.collections,
        fallbackId
      ),
      itemType: output.itemType,
      summary: output.summary.trim().slice(0, 160) || fallback.summary,
      gistTopics: gistResult.topics,
    };
  } catch (e) {
    console.error("[triageCapture]", e);
    const fallbackGist = await gistPromise;
    return {
      ...fallback,
      tags: fallbackGist.tags.length > 0 ? fallbackGist.tags : fallback.tags,
      gistTopics: fallbackGist.topics,
    };
  }
}
