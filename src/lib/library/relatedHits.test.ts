import { describe, expect, it } from "vitest";
import { hasLexicalOverlap, relatedHits } from "./relatedHits";

describe("relatedHits", () => {
  it("drops a nearest-neighbor GPU SSD card for a data-center question", () => {
    const kept = relatedHits("why data centers are bad for the environment", [
      {
        rank: 0.41,
        title: "Why didn't SSDs inside the GPU work",
        snippet: "Why didn't SSDs inside the GPU work",
      },
    ]);
    expect(kept).toEqual([]);
  });

  it("keeps the GPU SSD card when the question is actually about that", () => {
    const hit = {
      rank: 0.55,
      title: "Why didn't SSDs inside the GPU work",
      snippet: "Why didn't SSDs inside the GPU work",
    };
    expect(relatedHits("why didn't SSDs inside the GPU work", [hit])).toEqual([hit]);
  });

  it("keeps a strong semantic paraphrase even without shared keywords", () => {
    const hit = {
      rank: 0.74,
      title: "Nginx limit_req is a leaky bucket",
      snippet: "burst=20 nodelay",
    };
    expect(relatedHits("what did I save about rate limiting?", [hit])).toEqual([hit]);
  });

  it("drops a mid-rank hit that shares no content words", () => {
    const hit = {
      rank: 0.56,
      title: "Why didn't SSDs inside the GPU work",
      snippet: "Why didn't SSDs inside the GPU work",
    };
    expect(relatedHits("why data centers are bad for the environment", [hit])).toEqual([]);
  });
});

describe("hasLexicalOverlap", () => {
  it("matches ssd/gpu across a why-question", () => {
    expect(
      hasLexicalOverlap(
        "why didn't SSDs inside the GPU work",
        "Why didn't SSDs inside the GPU work",
        ""
      )
    ).toBe(true);
  });

  it("does not treat two why-questions as related", () => {
    expect(
      hasLexicalOverlap(
        "why data centers are bad for the environment",
        "Why didn't SSDs inside the GPU work",
        ""
      )
    ).toBe(false);
  });
});
