import { describe, expect, it } from "vitest";
import { isResurfaceEligible, pickDailyResurface, resurfaceScore } from "./resurface";

describe("isResurfaceEligible", () => {
  it("rejects a bookmark that was only used once", () => {
    expect(isResurfaceEligible(1, 100)).toBe(false);
  });

  it("rejects a twice-used bookmark idle for 20 days", () => {
    expect(isResurfaceEligible(2, 20)).toBe(false);
  });

  it("accepts a twice-used bookmark idle for 21 days", () => {
    expect(isResurfaceEligible(2, 21)).toBe(true);
  });
});

describe("resurfaceScore", () => {
  it("ranks higher useCount above lower useCount at the same idle gap", () => {
    expect(resurfaceScore(20, 30)).toBeGreaterThan(resurfaceScore(2, 30));
  });

  it("ranks a longer idle gap above a shorter one at the same useCount", () => {
    expect(resurfaceScore(5, 90)).toBeGreaterThan(resurfaceScore(5, 21));
  });
});

describe("pickDailyResurface", () => {
  const pool = Array.from({ length: 20 }, (_, i) => ({
    id: `b${i}`,
    score: 100 - i,
  }));

  it("returns at most three items from the top 12 by score", () => {
    const picked = pickDailyResurface(pool, "user-1", "2026-08-21");
    expect(picked).toHaveLength(3);
    const top12 = new Set(pool.slice(0, 12).map((p) => p.id));
    for (const item of picked) expect(top12.has(item.id)).toBe(true);
  });

  it("returns the same three for the same user and local date", () => {
    const a = pickDailyResurface(pool, "user-1", "2026-08-21").map((p) => p.id);
    const b = pickDailyResurface(pool, "user-1", "2026-08-21").map((p) => p.id);
    expect(a).toEqual(b);
  });
});
