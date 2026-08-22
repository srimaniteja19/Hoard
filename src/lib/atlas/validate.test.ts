import { describe, expect, it } from "vitest";
import { hydrateStations, isThin, validateSyllabus, weeklyBudgetMinutes } from "./validate";

const week = (id: string) => ({ id, label: id, estimatedMinutes: 0 });
const st = (over: Partial<import("./types").AtlasStationDraft> = {}): import("./types").AtlasStationDraft => ({
  id: "s1",
  weekId: "w1",
  title: "Pointers",
  why: "You need the machine model",
  estimatedMinutes: 25,
  energy: "DEEP",
  kind: "read",
  required: true,
  ...over,
});

describe("weeklyBudgetMinutes", () => {
  it("weeknights is 5 sessions", () => {
    expect(weeklyBudgetMinutes(45, "weeknights")).toBe(225);
  });
  it("weekends is 2", () => expect(weeklyBudgetMinutes(45, "weekends")).toBe(90));
  it("daily is 7", () => expect(weeklyBudgetMinutes(20, "daily")).toBe(140));
});

describe("validateSyllabus", () => {
  it("drops extra weeks beyond 6 and extra required stations beyond 6 per week", () => {
    const weeks = Array.from({ length: 8 }, (_, i) => week(`w${i}`));
    const stations = weeks.flatMap((w) =>
      Array.from({ length: 8 }, (_, i) => st({ id: `${w.id}-${i}`, weekId: w.id, kind: i % 2 ? "make" : "read" }))
    );
    const out = validateSyllabus({ title: "X", brief: "Y", antiScope: [], weeks, stations }, "weeknights", 45);
    expect(out.weeks).toHaveLength(6);
    expect(out.stations.filter((s) => s.weekId === "w0" && s.required)).toHaveLength(6);
  });
  it("keeps overflow minutes and sets hoursPerWeek from budget", () => {
    const out = validateSyllabus(
      { title: "X", brief: "Y", antiScope: [], weeks: [week("w1")], stations: [st({ estimatedMinutes: 400 })] },
      "weeknights",
      45
    );
    expect(out.stations[0]?.estimatedMinutes).toBe(400);
    expect(out.hoursPerWeek).toBeCloseTo(225 / 60);
  });
  it("clamps minutes to ≥ 5", () => {
    const out = validateSyllabus(
      { title: "X", brief: "Y", antiScope: [], weeks: [week("w1")], stations: [st({ estimatedMinutes: 1 })] },
      "weeknights",
      45
    );
    expect(out.stations[0]?.estimatedMinutes).toBe(5);
  });
});

describe("isThin", () => {
  it("is thin when every station is read", () => {
    expect(isThin({ stations: hydrateStations([st(), st({ id: "s2" })]) }, [])).toBe(true);
  });
  it("is thin when an anti-scope token appears in a title", () => {
    const stations = hydrateStations([
      st({ kind: "make" }),
      st({ id: "s2", kind: "read", title: "Leetcode drills" }),
    ]);
    expect(isThin({ stations }, ["leetcode"])).toBe(true);
  });
  it("is thin when fewer than two kinds", () => {
    expect(isThin({ stations: hydrateStations([st({ kind: "make" }), st({ id: "s2", kind: "make" })]) }, [])).toBe(true);
  });
  it("is not thin with two kinds and clean titles", () => {
    expect(isThin({ stations: hydrateStations([st({ kind: "read" }), st({ id: "s2", kind: "make" })]) }, [])).toBe(false);
  });
});
