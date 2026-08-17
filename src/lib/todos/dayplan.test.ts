import { describe, it, expect } from "vitest";
import { computeDayPlan, BusyBlock, DayPlanTask } from "./dayplan";

describe("computeDayPlan — gaps", () => {
  it("with no busy blocks, the whole remaining day is one gap", () => {
    const result = computeDayPlan([], [], 9 * 60); // now = 9:00
    expect(result.gaps).toEqual([{ start: "09:00", end: "24:00", minutes: 900 }]);
    expect(result.freeMinutes).toBe(900);
  });

  it("splits the day around a single busy block", () => {
    const busy: BusyBlock[] = [{ start: "13:00", end: "14:00", title: "Lunch" }];
    const result = computeDayPlan(busy, [], 9 * 60);
    expect(result.gaps).toEqual([
      { start: "09:00", end: "13:00", minutes: 240 },
      { start: "14:00", end: "24:00", minutes: 600 },
    ]);
  });

  it("clips a gap that overlaps the current time", () => {
    // Meeting 9-11, "now" is 10:00 — the gap should start at 11:00, not 9:00.
    const busy: BusyBlock[] = [{ start: "09:00", end: "11:00", title: "Standup" }];
    const result = computeDayPlan(busy, [], 10 * 60);
    expect(result.gaps).toEqual([{ start: "11:00", end: "24:00", minutes: 780 }]);
  });

  it("merges overlapping busy blocks before computing gaps", () => {
    const busy: BusyBlock[] = [
      { start: "13:00", end: "14:30", title: "A" },
      { start: "14:00", end: "15:00", title: "B" },
    ];
    const result = computeDayPlan(busy, [], 9 * 60);
    expect(result.gaps).toEqual([
      { start: "09:00", end: "13:00", minutes: 240 },
      { start: "15:00", end: "24:00", minutes: 540 },
    ]);
  });

  it("produces no gaps when busy blocks cover the entire remaining day", () => {
    const busy: BusyBlock[] = [{ start: "09:00", end: "24:00", title: "Conference" }];
    const result = computeDayPlan(busy, [], 9 * 60);
    expect(result.gaps).toEqual([]);
    expect(result.freeMinutes).toBe(0);
  });
});

describe("computeDayPlan — greedy-descending fill", () => {
  it("packs the largest task first, into the earliest gap it fits", () => {
    const busy: BusyBlock[] = [{ start: "11:00", end: "12:00", title: "Meeting" }];
    const tasks: DayPlanTask[] = [
      { id: "a", title: "Small", estimatedMinutes: 15 },
      { id: "b", title: "Big", estimatedMinutes: 90 },
    ];
    // Gaps: 09:00-11:00 (120m), 12:00-24:00 (720m). Big (90) placed first,
    // fits the first gap (120 >= 90); Small (15) also fits gap 0 (30 left).
    const result = computeDayPlan(busy, tasks, 9 * 60);
    expect(result.unfitted).toEqual([]);
    const big = result.packed.find((t) => t.id === "b");
    const small = result.packed.find((t) => t.id === "a");
    expect(big?.gapIndex).toBe(0);
    expect(small?.gapIndex).toBe(0);
  });

  it("moves to the next gap once the first is full", () => {
    const busy: BusyBlock[] = [{ start: "10:00", end: "11:00", title: "Meeting" }];
    const tasks: DayPlanTask[] = [
      { id: "a", title: "Fills gap 0", estimatedMinutes: 60 },
      { id: "b", title: "Also needs room", estimatedMinutes: 30 },
    ];
    // Gaps: 09:00-10:00 (60m), 11:00-24:00 (780m).
    const result = computeDayPlan(busy, tasks, 9 * 60);
    const a = result.packed.find((t) => t.id === "a");
    const b = result.packed.find((t) => t.id === "b");
    expect(a?.gapIndex).toBe(0);
    expect(b?.gapIndex).toBe(1);
  });

  it("reports tasks that don't fit anywhere as unfitted, never dropped", () => {
    const tasks: DayPlanTask[] = [{ id: "a", title: "Too long", estimatedMinutes: 999999 }];
    const result = computeDayPlan([], tasks, 23 * 60); // only 1 hour left in the day
    expect(result.unfitted).toEqual(tasks);
    expect(result.packed).toEqual([]);
  });

  it("with no gaps at all, every task is unfitted", () => {
    const busy: BusyBlock[] = [{ start: "09:00", end: "24:00", title: "Conference" }];
    const tasks: DayPlanTask[] = [{ id: "a", title: "Anything", estimatedMinutes: 5 }];
    const result = computeDayPlan(busy, tasks, 9 * 60);
    expect(result.unfitted).toEqual(tasks);
  });
});
