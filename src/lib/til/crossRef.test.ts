import { describe, it, expect } from "vitest";
import { extractShortHashes, is4HexHash } from "./crossRef";

describe("extractShortHashes", () => {
  it("extracts valid 4-hex hashes from body text", () => {
    const text = "See also #a3f9 and #0c67 for context.";
    expect(extractShortHashes(text)).toEqual(["a3f9", "0c67"]);
  });

  it("ignores non-4-hex hashes or tags like #postgres or #a3f90", () => {
    const text = "Tagged with #postgres and #12345 but check #b2e4.";
    expect(extractShortHashes(text)).toEqual(["b2e4"]);
  });

  it("handles empty or null text", () => {
    expect(extractShortHashes("")).toEqual([]);
  });

  it("deduplicates hashes", () => {
    const text = "Referenced #a3f9 again in #A3F9.";
    expect(extractShortHashes(text)).toEqual(["a3f9"]);
  });
});

describe("is4HexHash", () => {
  it("validates 4 hex characters", () => {
    expect(is4HexHash("a3f9")).toBe(true);
    expect(is4HexHash("0C67")).toBe(true);
    expect(is4HexHash("1234")).toBe(true);
  });

  it("rejects non-4-hex strings", () => {
    expect(is4HexHash("a3f")).toBe(false);
    expect(is4HexHash("a3f90")).toBe(false);
    expect(is4HexHash("postgres")).toBe(false);
    expect(is4HexHash("g123")).toBe(false);
  });
});
