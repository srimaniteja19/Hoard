import { describe, expect, it } from "vitest";
import { weekContaining, weekLoad } from "./calendar";

describe("weekContaining", () => {
  it("returns Sunday–Saturday around the given day", () => {
    expect(weekContaining("2026-08-21")).toEqual([
      "2026-08-16",
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
    ]);
  });
});

describe("weekLoad", () => {
  it("counts open minutes and energy mix per day", () => {
    const load = weekLoad(
      ["2026-08-21", "2026-08-22"],
      [
        { dueDate: "2026-08-21", state: "OPEN", energy: "DEEP", estimatedMinutes: 60 },
        { dueDate: "2026-08-21", state: "OPEN", energy: "ERRAND", estimatedMinutes: 20 },
        { dueDate: "2026-08-21", state: "DONE", energy: "SHALLOW", estimatedMinutes: 15 },
        { dueDate: "2026-08-22", state: "OPEN", energy: "SHALLOW", estimatedMinutes: 25 },
        { dueDate: null, state: "OPEN", energy: "DEEP", estimatedMinutes: 90 },
      ]
    );
    expect(load).toEqual([
      { date: "2026-08-21", count: 2, minutes: 80, deep: 60, shallow: 0, errand: 20 },
      { date: "2026-08-22", count: 1, minutes: 25, deep: 0, shallow: 25, errand: 0 },
    ]);
  });
});
