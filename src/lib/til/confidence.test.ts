import { describe, it, expect } from "vitest";
import { confidence, applyRating, confidenceSql } from "./confidence";

const MS_PER_DAY = 86_400_000;

function daysAgo(days: number, from: Date = new Date("2025-01-15T12:00:00Z")): Date {
  return new Date(from.getTime() - days * MS_PER_DAY);
}

// Fixed "now" for deterministic tests
const NOW = new Date("2025-01-15T12:00:00Z");

describe("confidence", () => {
  it("returns 100 when just reviewed (0 days ago)", () => {
    expect(confidence(1, NOW, NOW)).toBe(100);
  });

  it("returns 50 at the half-life (stability=1, 1 day ago)", () => {
    expect(confidence(1, daysAgo(1, NOW), NOW)).toBe(50);
  });

  it("returns 50 at the half-life (stability=30, 30 days ago)", () => {
    expect(confidence(30, daysAgo(30, NOW), NOW)).toBe(50);
  });

  it("returns 50 at the half-life (stability=365, 365 days ago)", () => {
    expect(confidence(365, daysAgo(365, NOW), NOW)).toBe(50);
  });

  it("returns ~71 for partial decay (stability=1, 0.5 days ago)", () => {
    const result = confidence(1, daysAgo(0.5, NOW), NOW);
    expect(result).toBeGreaterThanOrEqual(70);
    expect(result).toBeLessThanOrEqual(72);
  });

  it("floors stability at 0.5 to prevent division issues", () => {
    const result = confidence(0, daysAgo(1, NOW), NOW);
    // With stability floored to 0.5: 2^(-1/0.5) = 2^(-2) = 0.25 → 25
    expect(result).toBe(25);
  });

  it("floors negative stability at 0.5", () => {
    const result = confidence(-5, daysAgo(1, NOW), NOW);
    expect(result).toBe(25);
  });

  it("returns near 0 for very old entries with low stability", () => {
    const result = confidence(1, daysAgo(30, NOW), NOW);
    // 2^(-30/1) ≈ 0 → rounds to 0
    expect(result).toBe(0);
  });

  it("returns high confidence for recent review with high stability", () => {
    const result = confidence(365, daysAgo(1, NOW), NOW);
    // 2^(-1/365) ≈ 0.998 → 100
    expect(result).toBe(100);
  });
});

describe("applyRating", () => {
  const defaults = { ease: 2.5, stability: 1, reviewCount: 0 };

  describe("GOT_IT", () => {
    it("increases ease by 0.1, multiplies stability by ease", () => {
      const result = applyRating("GOT_IT", defaults.ease, defaults.stability, defaults.reviewCount, NOW);
      expect(result.ease).toBeCloseTo(2.6);
      expect(result.stability).toBeCloseTo(1 * 2.6);
      expect(result.reviewCount).toBe(1);
      expect(result.lastReviewedAt).toEqual(NOW);
    });

    it("caps ease at 3.0", () => {
      const result = applyRating("GOT_IT", 2.95, 5, 10, NOW);
      expect(result.ease).toBe(3.0);
    });

    it("sets nextReviewAt = now + stability days", () => {
      const result = applyRating("GOT_IT", 2.5, 1, 0, NOW);
      const expectedNext = new Date(NOW.getTime() + result.stability * MS_PER_DAY);
      expect(result.nextReviewAt.getTime()).toBe(expectedNext.getTime());
    });
  });

  describe("FUZZY", () => {
    it("decreases ease by 0.15, multiplies stability by 1.3", () => {
      const result = applyRating("FUZZY", defaults.ease, defaults.stability, defaults.reviewCount, NOW);
      expect(result.ease).toBeCloseTo(2.35);
      expect(result.stability).toBeCloseTo(1.3);
      expect(result.reviewCount).toBe(1);
    });

    it("floors ease at 1.3", () => {
      const result = applyRating("FUZZY", 1.35, 2, 5, NOW);
      expect(result.ease).toBe(1.3);
    });
  });

  describe("FORGOT", () => {
    it("decreases ease by 0.2, resets stability to 1", () => {
      const result = applyRating("FORGOT", defaults.ease, 30, defaults.reviewCount, NOW);
      expect(result.ease).toBeCloseTo(2.3);
      expect(result.stability).toBe(1);
      expect(result.reviewCount).toBe(1);
    });

    it("floors ease at 1.3", () => {
      const result = applyRating("FORGOT", 1.4, 10, 3, NOW);
      expect(result.ease).toBe(1.3);
    });

    it("sets nextReviewAt to now + 1 day", () => {
      const result = applyRating("FORGOT", 2.5, 30, 0, NOW);
      const expectedNext = new Date(NOW.getTime() + 1 * MS_PER_DAY);
      expect(result.nextReviewAt.getTime()).toBe(expectedNext.getTime());
    });
  });

  it("always bumps reviewCount", () => {
    for (const rating of ["GOT_IT", "FUZZY", "FORGOT"] as const) {
      const result = applyRating(rating, 2.5, 1, 7, NOW);
      expect(result.reviewCount).toBe(8);
    }
  });

  it("always sets lastReviewedAt to now", () => {
    for (const rating of ["GOT_IT", "FUZZY", "FORGOT"] as const) {
      const result = applyRating(rating, 2.5, 1, 0, NOW);
      expect(result.lastReviewedAt).toEqual(NOW);
    }
  });
});

describe("confidenceSql", () => {
  it("exports a valid drizzle sql object for postgres derived column", () => {
    expect(confidenceSql).toBeDefined();
    expect(confidenceSql.queryChunks).toBeDefined();
  });
});
