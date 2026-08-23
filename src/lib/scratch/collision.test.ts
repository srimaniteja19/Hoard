import { describe, it, expect } from "vitest";
import { findCollisions, highlightMatches, formatRelativeAgo } from "./collision";

describe("findCollisions", () => {
  const candidates = [
    {
      id: "1",
      content: "Every silent CSS bug I've hit has been a stacking context nobody declared.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      content: "Transaction boundaries are invisible state too — the rollback is the tell.",
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      content: "Wear as encoding: a thing opened forty times should look handled.",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  it("returns empty array if input has fewer than 2 keywords", () => {
    const hits = findCollisions("CSS", candidates);
    expect(hits).toEqual([]);
  });

  it("finds collisions when input shares keywords with existing scraps", () => {
    const input = "Why does invisible state create silent CSS bugs?";
    const hits = findCollisions(input, candidates);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("2");
    expect(hits[0].sharedKeywords).toContain("invisible");
    expect(hits[0].sharedKeywords).toContain("state");
    expect(hits[0].highlightedText).toContain("<mark>");
  });

  it("highlights multiple matching keywords with <mark>", () => {
    const res = highlightMatches("Transaction boundaries are invisible state", ["transaction", "invisible"]);
    expect(res).toContain("<mark>Transaction</mark>");
    expect(res).toContain("<mark>invisible</mark>");
  });
});

describe("formatRelativeAgo", () => {
  it("formats relative days ago", () => {
    const now = new Date("2026-08-23T12:00:00Z");
    const twoDaysAgo = new Date("2026-08-21T12:00:00Z");
    expect(formatRelativeAgo(twoDaysAgo, now)).toBe("2 DAYS");
  });
});
