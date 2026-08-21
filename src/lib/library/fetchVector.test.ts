import { describe, expect, it } from "vitest";
import { citationHref, fetchVector, type VectorHit } from "./fetchVector";

function hit(partial: Partial<VectorHit> & Pick<VectorHit, "ownerType" | "ownerId" | "title">): VectorHit {
  return {
    url: "",
    kind: partial.ownerType === "til" ? "FACT" : "DOC",
    snippet: "snippet",
    rank: 0.9,
    ...partial,
  };
}

describe("citationHref", () => {
  it("points bookmarks at their source URL", () => {
    expect(
      citationHref(hit({ ownerType: "bookmark", ownerId: "12", title: "Rate limiting", url: "https://example.com/rl" }))
    ).toBe("https://example.com/rl");
  });

  it("points TILs at the record, using shortHash when present", () => {
    expect(citationHref(hit({ ownerType: "til", ownerId: "abc", title: "token bucket", shortHash: "a1b2" }))).toBe(
      "/til?hash=a1b2"
    );
    expect(citationHref(hit({ ownerType: "til", ownerId: "abc", title: "token bucket" }))).toBe("/til");
  });
});

describe("fetchVector", () => {
  it("returns an empty list when the query cannot be embedded", async () => {
    const hits = await fetchVector("user-1", "rate limiting", 8, {
      embedQuery: async () => null,
      searchNeighbors: async () => [hit({ ownerType: "bookmark", ownerId: "1", title: "should not appear" })],
    });
    expect(hits).toEqual([]);
  });

  it("returns mixed bookmark and TIL neighbors for the chat tool", async () => {
    const bookmark = hit({
      ownerType: "bookmark",
      ownerId: "9",
      title: "Rate limiting at the edge",
      url: "https://docs.example.com/rl",
      kind: "DOC",
      snippet: "token bucket vs sliding window",
    });
    const til = hit({
      ownerType: "til",
      ownerId: "til-1",
      title: "Nginx limit_req is a leaky bucket",
      kind: "GOTCHA",
      snippet: "burst=20 nodelay",
      shortHash: "c0de",
    });

    const hits = await fetchVector("user-1", "what did I save about rate limiting?", 8, {
      embedQuery: async () => [0.1, 0.2],
      searchNeighbors: async () => [bookmark, til],
    });

    expect(hits).toHaveLength(2);
    expect(hits[0].ownerType).toBe("bookmark");
    expect(hits[1].ownerType).toBe("til");
    expect(hits[1].shortHash).toBe("c0de");
  });

  it("caps results at the requested limit", async () => {
    const neighbors = Array.from({ length: 12 }, (_, i) =>
      hit({ ownerType: "bookmark", ownerId: String(i), title: `item ${i}` })
    );
    const hits = await fetchVector("user-1", "postgres", 3, {
      embedQuery: async () => [0.3],
      searchNeighbors: async (_userId, _embedding, limit) => neighbors.slice(0, limit),
    });
    expect(hits).toHaveLength(3);
  });
});
