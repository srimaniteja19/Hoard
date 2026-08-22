import { describe, expect, it } from "vitest";
import { nextStatusAfterCheck, requiredProgress, weekLoad } from "./progress";
import { hydrateStations } from "./validate";
import type { AtlasSyllabus } from "./types";

function syllabus(requiredDone: boolean, optionalDone = false): AtlasSyllabus {
  return {
    thin: false,
    hoursPerWeek: 3.75,
    weeks: [{ id: "w1", label: "W1", estimatedMinutes: 50 }],
    stations: hydrateStations([
      { id: "a", weekId: "w1", title: "A", why: "x", estimatedMinutes: 20, energy: "DEEP", kind: "read", required: true },
      { id: "b", weekId: "w1", title: "B", why: "x", estimatedMinutes: 30, energy: "SHALLOW", kind: "make", required: false },
    ]).map((s) =>
      s.id === "a" && requiredDone
        ? { ...s, state: "DONE", doneAt: "2026-08-21T00:00:00.000Z" }
        : s.id === "b" && optionalDone
          ? { ...s, state: "DONE", doneAt: "2026-08-21T00:00:00.000Z" }
          : s
    ),
  };
}

describe("requiredProgress", () => {
  it("ignores optional stations", () => {
    expect(requiredProgress(syllabus(false, true))).toEqual({ done: 0, total: 1 });
    expect(requiredProgress(syllabus(true, false))).toEqual({ done: 1, total: 1 });
  });
});

describe("weekLoad", () => {
  it("counts open required minutes and overflow past budget", () => {
    expect(weekLoad(syllabus(false), "w1", 15)).toEqual({
      openRequired: 1,
      openMinutes: 20,
      overflowMinutes: 5,
    });
  });
});

describe("nextStatusAfterCheck", () => {
  it("draft becomes walking; walking and archived stay", () => {
    expect(nextStatusAfterCheck("draft")).toBe("walking");
    expect(nextStatusAfterCheck("walking")).toBe("walking");
    expect(nextStatusAfterCheck("archived")).toBe("archived");
  });
});
