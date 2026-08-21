import { describe, expect, it } from "vitest";
import { searchLibrary, type SearchResult } from "./searchLibrary";

function result(id: number, useCount: number): SearchResult {
  return {
    id,
    title: `item-${id}`,
    url: `https://example.com/${id}`,
    ty: "DOC",
    src: "test",
    tag: "test",
    useCount,
    rank: 0,
  };
}

describe("searchLibrary hybrid fusion", () => {
  it("includes a vector neighbor that FTS did not return", async () => {
    const ftsHit = result(1, 3);
    const conceptualHit = result(2, 1);

    const hits = await searchLibrary("user-1", "burnout and deep work", 20, {
      fetchFts: async () => [ftsHit],
      embedQuery: async () => [0.1, 0.2],
      fetchVector: async () => [conceptualHit, ftsHit],
    });

    expect(hits.map((r) => r.id)).toContain(2);
  });

  it("does not include vector neighbors when the query embedding fails", async () => {
    const ftsHit = result(1, 3);
    const vectorOnly = result(99, 1);

    const hits = await searchLibrary("user-1", "zk-snark verification circuits", 20, {
      fetchFts: async () => [ftsHit],
      embedQuery: async () => null,
      fetchVector: async () => [vectorOnly],
    });

    expect(hits.map((r) => r.id)).toEqual([1]);
  });
});
