import { describe, expect, it } from "vitest";
import { buildEmbeddingText, hashEmbeddingText } from "./embeddingInput";

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

describe("hashEmbeddingText", () => {
  it("changes when the title changes so an unchanged body does not skip a re-embed", () => {
    const a = hashEmbeddingText(buildEmbeddingText({ title: "Old", note: "n", archivedText: "body" }));
    const b = hashEmbeddingText(buildEmbeddingText({ title: "New", note: "n", archivedText: "body" }));

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
