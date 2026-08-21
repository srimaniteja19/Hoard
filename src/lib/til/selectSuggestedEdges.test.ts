import { describe, expect, it } from "vitest";
import { selectSuggestedEdges } from "./selectSuggestedEdges";

function entry(id: string, tags: string[] = [], supersededById: string | null = null) {
  return { id, tags, supersededById };
}

describe("selectSuggestedEdges", () => {
  it("emits a suggested edge for a pair above the cosine threshold", () => {
    const edges = selectSuggestedEdges(
      [entry("a"), entry("b")],
      [{ a: "a", b: "b", cosine: 0.75 }]
    );

    expect(edges).toEqual([{ source: "entry:a", target: "entry:b", kind: "suggested" }]);
  });

  it("drops a pair below the cosine threshold", () => {
    const edges = selectSuggestedEdges(
      [entry("a"), entry("b")],
      [{ a: "a", b: "b", cosine: 0.74 }]
    );

    expect(edges).toEqual([]);
  });

  it("skips pairs that already share a tag", () => {
    const edges = selectSuggestedEdges(
      [entry("a", ["postgres"]), entry("b", ["postgres"])],
      [{ a: "a", b: "b", cosine: 0.95 }]
    );

    expect(edges).toEqual([]);
  });

  it("skips a supersession pair", () => {
    const edges = selectSuggestedEdges(
      [entry("old", [], "new"), entry("new")],
      [{ a: "old", b: "new", cosine: 0.99 }]
    );

    expect(edges).toEqual([]);
  });

  it("dedupes the reverse of the same undirected pair", () => {
    const edges = selectSuggestedEdges(
      [entry("a"), entry("b")],
      [
        { a: "a", b: "b", cosine: 0.9 },
        { a: "b", b: "a", cosine: 0.9 },
      ]
    );

    expect(edges).toHaveLength(1);
  });

  it("keeps at most two suggested edges per node, preferring higher cosine", () => {
    const edges = selectSuggestedEdges(
      [entry("hub"), entry("p"), entry("q"), entry("r")],
      [
        { a: "hub", b: "p", cosine: 0.95 },
        { a: "hub", b: "q", cosine: 0.9 },
        { a: "hub", b: "r", cosine: 0.85 },
      ]
    );

    const ids = edges.map((e) => [e.source, e.target].sort().join("-"));
    expect(ids).toHaveLength(2);
    expect(ids).toContain("entry:hub-entry:p");
    expect(ids).toContain("entry:hub-entry:q");
    expect(ids).not.toContain("entry:hub-entry:r");
  });
});
