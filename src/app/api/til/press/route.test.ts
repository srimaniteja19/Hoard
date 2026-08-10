import { describe, it, expect } from "vitest";

describe("PRESS issue calculation", () => {
  it("calculates issue number relative to base year 2025", () => {
    const calcIssue = (month: string) => {
      const [yearNum, monthNum] = month.split("-").map(Number);
      return Math.max(1, (yearNum - 2025) * 12 + monthNum);
    };

    expect(calcIssue("2025-01")).toBe(1);
    expect(calcIssue("2025-02")).toBe(2);
    expect(calcIssue("2025-12")).toBe(12);
    expect(calcIssue("2026-01")).toBe(13);
  });
});
