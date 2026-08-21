import { describe, expect, it } from "vitest";
import { computeConstellationCacheKey } from "./constellationCacheKey";

describe("computeConstellationCacheKey", () => {
  it("is deterministic for the same inputs", () => {
    const a = computeConstellationCacheKey("user1", 42, "2026-01-01T00:00:00.000Z");
    const b = computeConstellationCacheKey("user1", 42, "2026-01-01T00:00:00.000Z");
    expect(a).toBe(b);
  });

  it("changes when entryCount changes", () => {
    const a = computeConstellationCacheKey("user1", 42, "2026-01-01T00:00:00.000Z");
    const b = computeConstellationCacheKey("user1", 43, "2026-01-01T00:00:00.000Z");
    expect(a).not.toBe(b);
  });

  it("changes when maxUpdatedAt changes", () => {
    const a = computeConstellationCacheKey("user1", 42, "2026-01-01T00:00:00.000Z");
    const b = computeConstellationCacheKey("user1", 42, "2026-01-02T00:00:00.000Z");
    expect(a).not.toBe(b);
  });

  it("changes when userId changes", () => {
    const a = computeConstellationCacheKey("user1", 42, "2026-01-01T00:00:00.000Z");
    const b = computeConstellationCacheKey("user2", 42, "2026-01-01T00:00:00.000Z");
    expect(a).not.toBe(b);
  });

  it("handles a null maxUpdatedAt (empty graph)", () => {
    expect(() => computeConstellationCacheKey("user1", 0, null)).not.toThrow();
  });

  it("changes when TIL embeddings maxUpdatedAt changes", () => {
    const a = computeConstellationCacheKey("user1", 42, "2026-01-01T00:00:00.000Z", null);
    const b = computeConstellationCacheKey("user1", 42, "2026-01-01T00:00:00.000Z", "2026-01-03T00:00:00.000Z");
    expect(a).not.toBe(b);
  });
});
