import { describe, it, expect } from "vitest";
import { validateKeepReason } from "./validation";

describe("validateKeepReason", () => {
  it("flags empty reason as required", () => {
    const res = validateKeepReason("");
    expect(res.valid).toBe(false);
    expect(res.status).toBe("A REASON IS REQUIRED");
    expect(res.isWarn).toBe(true);
  });

  it("flags whitespace-only as required", () => {
    const res = validateKeepReason("   \n\t  ");
    expect(res.valid).toBe(false);
    expect(res.status).toBe("A REASON IS REQUIRED");
  });

  it("flags 1 or 2 words as too short", () => {
    const oneWord = validateKeepReason("Important");
    expect(oneWord.valid).toBe(false);
    expect(oneWord.status).toBe("TOO SHORT TO BE A REASON");
    expect(oneWord.wordCount).toBe(1);

    const twoWords = validateKeepReason("Very interesting");
    expect(twoWords.valid).toBe(false);
    expect(twoWords.status).toBe("TOO SHORT TO BE A REASON");
    expect(twoWords.wordCount).toBe(2);
  });

  it("approves 3 or more words as GOOD", () => {
    const threeWords = validateKeepReason("Key architectural insight");
    expect(threeWords.valid).toBe(true);
    expect(threeWords.status).toBe("GOOD");
    expect(threeWords.isWarn).toBe(false);
    expect(threeWords.wordCount).toBe(3);

    const manyWords = validateKeepReason("This is directly applicable to our routing layer.");
    expect(manyWords.valid).toBe(true);
    expect(manyWords.status).toBe("GOOD");
    expect(manyWords.wordCount).toBe(8);
  });
});
