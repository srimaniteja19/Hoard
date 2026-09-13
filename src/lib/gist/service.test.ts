import { describe, it, expect } from "vitest";
import {
  formatTopicTag,
  prepareClassificationText,
  classifyContent,
  suggestTagsFromContent,
} from "./service";

describe("Gist Service", () => {
  it("formats topic slugs into valid kebab-case tags", () => {
    expect(formatTopicTag("technology")).toBe("technology");
    expect(formatTopicTag("arts-culture")).toBe("arts-culture");
    expect(formatTopicTag("Food & Drink")).toBe("food-drink");
    expect(formatTopicTag("#science")).toBe("science");
  });

  it("prepares classification text by combining title and content", () => {
    const text = prepareClassificationText({
      title: "Building Realtime Apps",
      content: "Learn how to use WebSockets and Server-Sent Events with Next.js.",
    });
    expect(text).toContain("Building Realtime Apps");
    expect(text).toContain("WebSockets and Server-Sent Events");
  });

  it("extracts cues from URL when title and content are missing", () => {
    const text = prepareClassificationText({
      url: "https://example.com/posts/deep-learning-transformers",
    });
    expect(text).toContain("posts deep learning transformers");
  });

  it("classifies text into topics via native Gist model", async () => {
    const topics = await classifyContent(
      "Deep learning neural networks with PyTorch and CUDA gpu training",
      { topK: 3 }
    );
    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0]).toHaveProperty("slug");
    expect(topics[0]).toHaveProperty("name");
    expect(topics[0]).toHaveProperty("score");
    expect(topics[0]).toHaveProperty("tag");
    expect(topics.some((t) => t.slug === "technology" || t.slug === "science")).toBe(true);
  });

  it("suggests tags from title and content", async () => {
    const result = await suggestTagsFromContent({
      title: "Artisan sourdough bread recipe and fermentation tips",
      content: "A guide on dough hydration, levain maintenance, and baking in a Dutch oven.",
      topK: 3,
    });
    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.tags).toContain("food-drink");
  });

  it("handles empty input safely without throwing", async () => {
    const result = await suggestTagsFromContent({});
    expect(result).toEqual({ topics: [], tags: [] });
  });
});
