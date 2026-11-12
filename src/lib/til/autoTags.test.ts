import { describe, it, expect, vi, beforeEach } from "vitest";
import { deriveTilTitle, normalizeTilTag, generateTilAutoTags } from "./autoTags";

const mockGenerateText = vi.fn();
const mockSuggestTags = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  };
});

vi.mock("@/lib/gist/service", () => ({
  suggestTagsFromContent: (...args: unknown[]) => mockSuggestTags(...args),
}));

describe("normalizeTilTag", () => {
  it("normalizes casing, hashes, and punctuation into kebab-case", () => {
    expect(normalizeTilTag(" #React Router ")).toBe("react-router");
    expect(normalizeTilTag("Web_Perf!")).toBe("web-perf");
  });
});

describe("deriveTilTitle", () => {
  it("prefers explicit link preview title over generic LINK body", () => {
    expect(
      deriveTilTitle({
        type: "LINK",
        title: "Postgres Partial Indexes Explained",
        body: "Evidence reference link",
        linkUrl: "https://example.com/pg-indexes",
      })
    ).toBe("Postgres Partial Indexes Explained");
  });

  it("extracts NEWS headline when no explicit title is passed", () => {
    expect(
      deriveTilTitle({
        type: "NEWS",
        body: "HEADLINE: SQLite 3.50 ships faster JSONB\n\n* New operators",
      })
    ).toBe("SQLite 3.50 ships faster JSONB");
  });

  it("extracts ACTUALLY truth line for GOTCHA entries", () => {
    expect(
      deriveTilTitle({
        type: "GOTCHA",
        body: "I THOUGHT: revalidateTag works sync\nACTUALLY: Next.js cache tags need await",
      })
    ).toBe("Next.js cache tags need await");
  });

  it("falls back to URL path slug when body and title are empty", () => {
    expect(
      deriveTilTitle({
        type: "LINK",
        linkUrl: "https://example.com/posts/deep-learning-transformers",
      })
    ).toBe("deep learning transformers");
  });
});

describe("generateTilAutoTags", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
    mockSuggestTags.mockReset();
  });

  it("uses LLM tags prioritized from title when available", async () => {
    mockGenerateText.mockResolvedValue({
      output: { tags: ["PostgreSQL", "#Database Indexing"] },
    });
    mockSuggestTags.mockResolvedValue({ topics: [], tags: ["technology"] });

    const tags = await generateTilAutoTags({
      type: "FACT",
      title: "Postgres partial indexes keep B-trees compact",
    });

    expect(tags).toEqual(["postgresql", "database-indexing"]);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockSuggestTags).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Postgres partial indexes keep B-trees compact",
      })
    );
  });

  it("falls back to on-device Gist + codeLang when LLM fails or times out", async () => {
    mockGenerateText.mockRejectedValue(new Error("timeout"));
    mockSuggestTags.mockResolvedValue({
      topics: [{ slug: "technology", name: "Technology & Software", score: 0.7, tag: "technology" }],
      tags: ["technology"],
    });

    const tags = await generateTilAutoTags({
      type: "SNIPPET",
      body: "Debounce hook with cleanup",
      code: "export function useDebounce() {}",
      codeLang: "TypeScript",
    });

    expect(tags).toEqual(["technology", "typescript"]);
  });

  it("returns empty array when entry has no title, content, url, or language", async () => {
    const tags = await generateTilAutoTags({ type: "FACT", body: "   " });
    expect(tags).toEqual([]);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });
});

