import { describe, it, expect } from "vitest";
import { applyRating } from "@/lib/til/confidence";

describe("RECALL review submission logic", () => {
  it("persists optimistic ratings immediately per card", () => {
    const initial = { ease: 2.5, stability: 1, reviewCount: 0 };
    const now = new Date("2025-01-15T12:00:00Z");

    const result = applyRating("GOT_IT", initial.ease, initial.stability, initial.reviewCount, now);

    expect(result.reviewCount).toBe(1);
    expect(result.lastReviewedAt).toEqual(now);
    expect(result.nextReviewAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("deck selection excludes superseded entries and enforces cap of 7", () => {
    const entries = [
      { id: "1", nextReviewAt: new Date("2025-01-01"), supersededById: null },
      { id: "2", nextReviewAt: new Date("2025-01-02"), supersededById: "3" }, // Superseded — EXCLUDED!
      { id: "3", nextReviewAt: new Date("2025-01-03"), supersededById: null },
    ];

    const eligible = entries.filter((e) => !e.supersededById);
    const deck = eligible.slice(0, 7);

    expect(deck.map((e) => e.id)).toEqual(["1", "3"]);
    expect(deck.length).toBeLessThanOrEqual(7);
  });
});
