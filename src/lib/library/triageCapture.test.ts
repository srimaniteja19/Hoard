import { describe, expect, it } from "vitest";
import {
  fallbackTriage,
  matchSuggestedCollection,
  primaryTag,
  triageSchema,
} from "./triageCapture";

const COLLECTIONS = [
  { id: "u-unsorted", name: "Unsorted" },
  { id: "u-ai", name: "AI & retrieval" },
  { id: "u-systems", name: "Data & storage" },
];

describe("triageSchema", () => {
  it("accepts the capture metadata object", () => {
    const parsed = triageSchema.parse({
      tags: ["rate-limiting", "nginx"],
      suggestedCollection: "AI & retrieval",
      itemType: "REFERENCE",
      summary: "Token bucket vs sliding window at the edge.",
    });
    expect(parsed.itemType).toBe("REFERENCE");
    expect(parsed.tags).toEqual(["rate-limiting", "nginx"]);
  });

  it("rejects an itemType that is not REFERENCE or QUEUED", () => {
    expect(() =>
      triageSchema.parse({
        tags: ["x"],
        suggestedCollection: "Unsorted",
        itemType: "UNREAD",
        summary: "nope",
      })
    ).toThrow();
  });
});

describe("matchSuggestedCollection", () => {
  it("matches a collection by name, case-insensitive", () => {
    expect(matchSuggestedCollection("ai & retrieval", COLLECTIONS, "u-unsorted")).toBe("u-ai");
  });

  it("matches a collection by id", () => {
    expect(matchSuggestedCollection("u-systems", COLLECTIONS, "u-unsorted")).toBe("u-systems");
  });

  it("falls back when the suggestion is unknown", () => {
    expect(matchSuggestedCollection("Cooking", COLLECTIONS, "u-unsorted")).toBe("u-unsorted");
  });
});

describe("primaryTag", () => {
  it("uses the first normalized tag", () => {
    expect(primaryTag(["#Rate Limiting", "nginx"])).toBe("rate-limiting");
  });

  it("falls back when the model returns nothing usable", () => {
    expect(primaryTag([])).toBe("general");
    expect(primaryTag(["   "])).toBe("general");
  });
});

describe("fallbackTriage", () => {
  it("uses the kind heuristic for itemType and keeps a one-line summary", () => {
    const docs = fallbackTriage({
      kind: "DOC",
      title: "Rate limiting",
      description: "How token buckets work at the edge.",
      collections: COLLECTIONS,
    });
    expect(docs.itemType).toBe("REFERENCE");
    expect(docs.suggestedCollection).toBe("u-unsorted");
    expect(docs.summary.length).toBeGreaterThan(0);
    expect(docs.summary.length).toBeLessThanOrEqual(160);

    const article = fallbackTriage({
      kind: "ART",
      title: "A long essay",
      collections: COLLECTIONS,
    });
    expect(article.itemType).toBe("QUEUED");
  });
});
