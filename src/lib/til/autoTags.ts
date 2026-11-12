import { z } from "zod";
import { generateText, Output } from "ai";
import { TRIAGE_MODEL, gatewayProviderOptions, languageModel } from "@/lib/ai/models";
import { suggestTagsFromContent } from "@/lib/gist/service";
import type { TilType } from "@/db/schema";

const GENERIC_BODIES = new Set([
  "evidence reference link",
  "code utility snippet",
  "til link",
]);

const autoTagsSchema = z.object({
  tags: z.array(z.string()).min(1).max(4),
});

export interface TilAutoTagInput {
  type?: TilType | string | null;
  title?: string | null;
  body?: string | null;
  code?: string | null;
  codeLang?: string | null;
  linkUrl?: string | null;
  linkDescription?: string | null;
  maxTags?: number;
}

export function normalizeTilTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/**
 * Extracts the clearest title cue from an explicit title, link preview title,
 * NEWS headline, or leading line of the TIL body.
 */
export function deriveTilTitle(input: TilAutoTagInput): string {
  const explicit = input.title?.trim();
  if (explicit) return explicit.slice(0, 160);

  const rawBody = (input.body || "").trim();
  if (rawBody && !GENERIC_BODIES.has(rawBody.toLowerCase())) {
    const headlineMatch = rawBody.match(/^HEADLINE:\s*(.+)$/im);
    if (headlineMatch?.[1]?.trim()) {
      return headlineMatch[1].trim().slice(0, 160);
    }

    const actuallyMatch = rawBody.match(/^ACTUALLY:\s*(.+)$/im);
    if (actuallyMatch?.[1]?.trim()) {
      return actuallyMatch[1].trim().slice(0, 160);
    }

    const lines = rawBody
      .split("\n")
      .map((line) =>
        line
          .replace(/^#+\s*/, "")
          .replace(/^>\s*/, "")
          .replace(/^(?:I THOUGHT|COST|SOURCE):\s*/i, "")
          .replace(/\[conviction:\d+\]/gi, "")
          .trim()
      )
      .filter(Boolean);

    if (lines[0]) {
      return lines[0].replace(/^["']|["']$/g, "").slice(0, 160);
    }
  }

  if (input.linkUrl?.trim()) {
    try {
      const parsed = new URL(input.linkUrl);
      const slug = parsed.pathname
        .replace(/\/+$/, "")
        .split("/")
        .filter(Boolean)
        .pop();
      if (slug) {
        return slug.replace(/[-_]+/g, " ").slice(0, 160);
      }
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      // Ignore malformed URL
    }
  }

  return "";
}

function dedupeTags(rawTags: string[], maxTags: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawTags) {
    const tag = normalizeTilTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= maxTags) break;
  }
  return out;
}

/**
 * Automatically generates 1-3 topic tags for a TIL entry based primarily on its
 * title (and supporting body/code/link context). Uses TRIAGE_MODEL first for
 * specific tags, with on-device Gist classification + codeLang as an immediate
 * local fallback when offline or unconfigured.
 */
export async function generateTilAutoTags(input: TilAutoTagInput): Promise<string[]> {
  const maxTags = Math.min(5, Math.max(1, input.maxTags ?? 3));
  const title = deriveTilTitle(input);
  const cleanBody =
    input.body && !GENERIC_BODIES.has(input.body.trim().toLowerCase())
      ? input.body.trim()
      : "";
  const content = [cleanBody, input.linkDescription?.trim(), input.code?.trim()]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 1200);

  if (!title && !content && !input.linkUrl?.trim() && !input.codeLang?.trim()) {
    return [];
  }

  const gistPromise = suggestTagsFromContent({
    title: title || null,
    content: content || null,
    url: input.linkUrl || null,
    topK: maxTags,
  }).catch(() => ({ topics: [], tags: [] }));

  const llmPromise = generateText({
    model: languageModel(TRIAGE_MODEL),
    output: Output.object({
      schema: autoTagsSchema,
      name: "TilAutoTags",
      description: "Concise topical tags generated primarily from the entry title",
    }),
    timeout: { totalMs: 4000 },
    maxRetries: 0,
    providerOptions: gatewayProviderOptions(TRIAGE_MODEL, ["feature:til-auto-tag"]),
    prompt: `Generate 1 to ${maxTags} concise lowercase kebab-case topic tags (no # prefix) for this Today-I-Learned note.
Base the tags primarily on the Title, refined by the Content/URL/Language if helpful.

Entry Type: ${input.type || "FACT"}
Title: ${title || "(none)"}
URL: ${input.linkUrl || "(none)"}
Code Language: ${input.codeLang || "(none)"}
Content: ${content ? content.slice(0, 700) : "(none)"}

Rules:
- Specific topic slugs (e.g. "react", "postgres", "us-politics", "web-perf", "docker"), not vague filler like "til", "note", "general", or "misc".
- At most ${maxTags} tags, ordered most relevant first.`,
  })
    .then((res) => dedupeTags(res.output?.tags ?? [], maxTags))
    .catch(() => [] as string[]);

  const [llmTags, gistResult] = await Promise.all([llmPromise, gistPromise]);

  const langTag =
    input.type === "SNIPPET" && input.codeLang?.trim()
      ? normalizeTilTag(input.codeLang)
      : "";

  if (llmTags.length > 0) {
    const merged = langTag && !llmTags.includes(langTag) ? [...llmTags, langTag] : llmTags;
    return dedupeTags(merged, maxTags);
  }

  const gistTags = dedupeTags(
    [...(gistResult.tags ?? []), ...(langTag ? [langTag] : [])],
    maxTags
  );
  return gistTags;
}

