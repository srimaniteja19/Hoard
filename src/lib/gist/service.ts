/**
 * Gist On-Device Topic Tagging Service
 * Powered by Desert Ant Labs Gist (@desert-ant-labs/gist/native)
 *
 * Classifies text across a 36-topic taxonomy in 101 languages.
 * Runs on-device in Node using native CoreML/LiteRT kernels.
 */

export interface GistTopic {
  slug: string;
  name: string;
  score: number;
  tag: string;
}

export interface SuggestTagsInput {
  title?: string | null;
  content?: string | null;
  text?: string | null;
  url?: string | null;
  topK?: number;
  threshold?: number;
}

export interface SuggestTagsResult {
  topics: GistTopic[];
  tags: string[];
}

let gistInstancePromise: Promise<any> | null = null;

/**
 * Lazily loads and returns the singleton Gist instance.
 */
export async function getGistInstance(): Promise<any> {
  if (!gistInstancePromise) {
    gistInstancePromise = (async () => {
      try {
        const { Gist } = await import("@desert-ant-labs/gist/native");
        return await Gist.load();
      } catch (err) {
        // Reset promise so subsequent calls can retry if initial load had transient failure
        gistInstancePromise = null;
        throw err;
      }
    })();
  }
  return gistInstancePromise;
}

/**
 * Normalizes a topic slug into a clean tag string.
 */
export function formatTopicTag(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Prepares input text for Gist topic classification.
 * Combines title, content, and optional URL cues, bounded to a reasonable length.
 */
export function prepareClassificationText(input: SuggestTagsInput): string {
  const parts: string[] = [];

  if (input.title?.trim()) {
    parts.push(input.title.trim());
  }

  if (input.content?.trim()) {
    // Strip markdown links/formatting where helpful and keep the first ~1500 chars
    const cleanContent = input.content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*`_>~]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    parts.push(cleanContent.slice(0, 1500));
  }

  if (input.text?.trim() && parts.length === 0) {
    parts.push(input.text.trim().slice(0, 1500));
  }

  if (parts.length === 0 && input.url?.trim()) {
    try {
      const parsed = new URL(input.url);
      const pathname = parsed.pathname.replace(/[/_\-]+/g, " ").trim();
      if (pathname) parts.push(pathname);
    } catch {
      // Ignore invalid URL
    }
  }

  return parts.join("\n\n").trim();
}

/**
 * Classifies text into ranked Gist topics.
 */
export async function classifyContent(
  text: string,
  options: { topK?: number; threshold?: number } = {}
): Promise<GistTopic[]> {
  const clean = text.trim();
  if (!clean) return [];

  try {
    const gist = await getGistInstance();
    const rawTopics: Array<{ slug: string; name: string; score: number }> = await gist.classify(
      clean,
      {
        topK: options.topK ?? 4,
        threshold: options.threshold,
      }
    );

    return rawTopics.map((item) => ({
      slug: item.slug,
      name: item.name,
      score: item.score,
      tag: formatTopicTag(item.slug),
    }));
  } catch (error) {
    console.warn("[Gist] Classification failed or model unavailable:", error);
    return [];
  }
}

/**
 * High-level suggestion helper: converts text/title/content into suggested tags.
 */
export async function suggestTagsFromContent(
  input: SuggestTagsInput
): Promise<SuggestTagsResult> {
  const text = prepareClassificationText(input);
  if (!text) {
    return { topics: [], tags: [] };
  }

  const topics = await classifyContent(text, {
    topK: input.topK ?? 4,
    threshold: input.threshold,
  });

  const tags = topics.map((t) => t.tag).filter(Boolean);

  return {
    topics,
    tags,
  };
}
