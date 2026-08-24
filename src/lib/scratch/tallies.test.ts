import { describe, it, expect } from "vitest";
import { buildDaySummary, computeTallies, computeYearWall, getOnThisDay, getGoneQuiet, buildTagTree } from "./tallies";
import { ScrapRow } from "@/db/schema";

function mockScrap(partial: Partial<ScrapRow>): ScrapRow {
  return {
    id: "s1",
    userId: "u1",
    content: "Sample",
    kind: "LOG",
    color: "orange",
    tilt: "0deg",
    notes: "",
    status: "raw",
    statusLabel: "RAW",
    promotedTo: null,
    promotedId: null,
    threadN: 0,
    threadSummary: null,
    weldedToId: null,
    loggedFor: "2026-08-23",
    occurredOn: "2026-08-23",
    entities: {},
    tags: [],
    isBuried: false,
    buriedAt: null,
    createdAt: new Date("2026-08-23T10:00:00Z"),
    updatedAt: new Date("2026-08-23T10:00:00Z"),
    ...partial,
  };
}

describe("tallies & logbook algorithms", () => {
  it("builds daily entity summary", () => {
    const logs = [
      mockScrap({ entities: { label: "Film" } }),
      mockScrap({ entities: { label: "Movement", measure: "10", unit: "MILES" } }),
      mockScrap({ entities: { label: "Person" } }),
    ];
    expect(buildDaySummary(logs)).toBe("1 FILM · 10 MILES · 1 PERSON");
  });

  it("computes YoY tallies with delta arrows", () => {
    const scraps = [
      mockScrap({ occurredOn: "2026-05-10", entities: { label: "Film" } }),
      mockScrap({ occurredOn: "2026-06-12", entities: { label: "Film" } }),
      mockScrap({ occurredOn: "2025-05-10", entities: { label: "Film" } }), // Last year
    ];
    const tallies = computeTallies(scraps, 2026);
    const filmTally = tallies.find((t) => t.key === "films");
    expect(filmTally).toBeDefined();
    expect(filmTally?.count).toBe(2);
    expect(filmTally?.deltaText).toBe("▲ +1");
    expect(filmTally?.isUp).toBe(true);
  });

  it("finds On This Day memories from previous years", () => {
    const scraps = [
      mockScrap({ occurredOn: "2025-08-23", entities: { verb: "WATCHED", title: "Dune: Part One" } }),
      mockScrap({ occurredOn: "2026-08-23", entities: { verb: "WATCHED", title: "Dune: Part Two" } }),
    ];
    const memories = getOnThisDay(scraps, new Date("2026-08-23T12:00:00Z"));
    expect(memories.length).toBe(1);
    expect(memories[0].title).toContain("Dune: Part One");
    expect(memories[0].yearsAgo).toBe(1);
  });

  it("detects habitual verbs gone quiet", () => {
    const scraps = [
      mockScrap({ occurredOn: "2026-06-01", entities: { verb: "PLAYED" } }),
      mockScrap({ occurredOn: "2026-06-15", entities: { verb: "PLAYED" } }),
    ];
    const gone = getGoneQuiet(scraps, new Date("2026-08-23T12:00:00Z"));
    expect(gone.length).toBe(1);
    expect(gone[0].verb).toBe("PLAYED");
    expect(gone[0].daysAgo).toBeGreaterThan(60);
  });

  it("derives hierarchical tag tree from flat co-occurrence", () => {
    const scraps = [
      mockScrap({ tags: ["#fitness", "#walks"] }),
      mockScrap({ tags: ["#fitness", "#walks"] }),
      mockScrap({ tags: ["#fitness", "#gym"] }),
      mockScrap({ tags: ["#movies"] }),
    ];
    const tree = buildTagTree(scraps);
    const fitnessNode = tree.find((t) => t.tag === "#fitness");
    expect(fitnessNode).toBeDefined();
    expect(fitnessNode?.children.some((c) => c.tag === "#walks")).toBe(true);
  });
});
