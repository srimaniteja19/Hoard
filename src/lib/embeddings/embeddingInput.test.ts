import { describe, expect, it } from "vitest";
import { buildEmbeddingText, buildTilEmbeddingText, hashEmbeddingText } from "./embeddingInput";

describe("buildEmbeddingText", () => {
  it("joins title, note, and archived body, truncating the body at 8000 characters", () => {
    const archivedText = "x".repeat(8200);
    const text = buildEmbeddingText({
      title: "Burnout essay",
      note: "Cal Newport notes",
      archivedText,
    });

    expect(text.startsWith("Burnout essay\nCal Newport notes\n")).toBe(true);
    expect(text.length).toBe("Burnout essay\nCal Newport notes\n".length + 8000);
  });
});

describe("buildTilEmbeddingText", () => {
  it("joins body, code, and link URL, truncating the body at 8000 characters", () => {
    const body = "x".repeat(8200);
    const text = buildTilEmbeddingText({
      body,
      code: "const x = 1",
      linkUrl: "https://example.com/deep-work",
    });

    expect(text.endsWith("\nconst x = 1\nhttps://example.com/deep-work")).toBe(true);
    expect(text.length).toBe(8000 + "\nconst x = 1\nhttps://example.com/deep-work".length);
  });
});

describe("hashEmbeddingText", () => {
  it("changes when the title changes so an unchanged body does not skip a re-embed", () => {
    const a = hashEmbeddingText(buildEmbeddingText({ title: "Old", note: "n", archivedText: "body" }));
    const b = hashEmbeddingText(buildEmbeddingText({ title: "New", note: "n", archivedText: "body" }));

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
