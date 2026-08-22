import { describe, expect, it } from "vitest";
import { computeDayPlan } from "./dayplan";
import { collectTags, dayLoadStamp, openLoadForDay } from "./load";

describe("dayLoadStamp", () => {
  it("formats an empty day", () => {
    expect(dayLoadStamp({ openCount: 0, openMinutes: 0, unfittedMinutes: 0 })).toBe("0 open");
  });

  it("formats count and time without a shortfall", () => {
    expect(dayLoadStamp({ openCount: 3, openMinutes: 70, unfittedMinutes: 0 })).toBe("3 open · 1h 10m");
  });

  it("appends the unfitted remainder", () => {
    expect(dayLoadStamp({ openCount: 3, openMinutes: 70, unfittedMinutes: 40 })).toBe(
      "3 open · 1h 10m · 40m won’t fit"
    );
  });
});

describe("openLoadForDay", () => {
  const tasks = [
    { id: "a", title: "Deep", estimatedMinutes: 60, dueDate: "2026-08-21", state: "OPEN" as const },
    { id: "b", title: "Errand", estimatedMinutes: 20, dueDate: "2026-08-21", state: "OPEN" as const },
    { id: "c", title: "Late", estimatedMinutes: 30, dueDate: "2026-08-19", state: "OPEN" as const },
    { id: "d", title: "Done", estimatedMinutes: 15, dueDate: "2026-08-21", state: "DONE" as const },
    { id: "e", title: "Later", estimatedMinutes: 45, dueDate: "2026-08-22", state: "OPEN" as const },
  ];

  it("sums open work due on a future day and skips packing", () => {
    expect(
      openLoadForDay(tasks, {
        selected: "2026-08-22",
        today: "2026-08-21",
        nowMinutes: 10 * 60,
        busy: [],
      })
    ).toEqual({ openCount: 1, openMinutes: 45, unfittedMinutes: 0 });
  });

  it("packs today's open work plus overdue against remaining gaps", () => {
    const load = openLoadForDay(tasks, {
      selected: "2026-08-21",
      today: "2026-08-21",
      nowMinutes: 23 * 60,
      busy: [],
    });
    const plan = computeDayPlan(
      [],
      [
        { id: "a", title: "Deep", estimatedMinutes: 60 },
        { id: "b", title: "Errand", estimatedMinutes: 20 },
        { id: "c", title: "Late", estimatedMinutes: 30 },
      ],
      23 * 60
    );
    expect(load.openCount).toBe(3);
    expect(load.openMinutes).toBe(110);
    expect(load.unfittedMinutes).toBe(plan.unfitted.reduce((sum, task) => sum + task.estimatedMinutes, 0));
    expect(load.unfittedMinutes).toBeGreaterThan(0);
  });
});

describe("collectTags", () => {
  it("returns unique sorted tags from open todos", () => {
    expect(
      collectTags([
        { tags: ["home", "work"], state: "OPEN" },
        { tags: ["work"], state: "OPEN" },
        { tags: ["archive"], state: "DONE" },
        { tags: ["zzz"], state: "GRAVEYARD" },
      ])
    ).toEqual(["home", "work"]);
  });
});
