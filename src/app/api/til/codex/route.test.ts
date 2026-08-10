import { describe, it, expect } from "vitest";

describe("CODEX calculations", () => {
  it("calculates span of days between first and last loggedFor date", () => {
    const firstDate = "2025-01-01";
    const lastDate = "2025-02-10";

    const d1 = new Date(firstDate);
    const d2 = new Date(lastDate);
    const spanDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    expect(spanDays).toBe(41);
  });

  it("calculates topic average confidence ignoring superseded entries", () => {
    const entries = [
      { id: "1", confidence: 90, supersededById: null },
      { id: "2", confidence: 50, supersededById: null },
      { id: "3", confidence: 10, supersededById: "4" }, // Superseded — MUST be excluded!
    ];

    const nonSuperseded = entries.filter((e) => !e.supersededById);
    const avgConfidence = Math.round(
      nonSuperseded.reduce((acc, curr) => acc + curr.confidence, 0) / nonSuperseded.length
    );

    expect(avgConfidence).toBe(70); // (90 + 50) / 2 = 70 (10 is excluded)
  });

  it("computes ALSO SEE adjacency tags correctly", () => {
    const activeTopicName = "postgres";
    const entryTags = ["postgres", "docker", "sql"];

    const alsoSeeTags = entryTags.filter((t) => t.toLowerCase() !== activeTopicName.toLowerCase());

    expect(alsoSeeTags).toEqual(["docker", "sql"]);
  });
});
