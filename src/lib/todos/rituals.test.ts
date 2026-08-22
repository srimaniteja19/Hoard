import { describe, expect, it } from "vitest";
import { isRitual, oneShotsForDay, ritualLabel, ritualWeekMarks, ritualsForDay } from "./rituals";

const series = [
  {
    id: "root",
    title: "Read",
    state: "DONE",
    dueDate: "2026-08-20",
    completedAt: new Date(2026, 7, 20, 8, 0).toISOString(),
    recurrenceRule: "daily",
    recurrenceParentId: null,
    seriesPosition: 1,
  },
  {
    id: "open",
    title: "Read",
    state: "OPEN",
    dueDate: "2026-08-21",
    completedAt: null,
    recurrenceRule: "daily",
    recurrenceParentId: "root",
    seriesPosition: 2,
  },
];

describe("isRitual", () => {
  it("is true when a recurrence rule or parent is set", () => {
    expect(isRitual({ recurrenceRule: "daily", recurrenceParentId: null })).toBe(true);
    expect(isRitual({ recurrenceRule: null, recurrenceParentId: "root" })).toBe(true);
    expect(isRitual({ recurrenceRule: null, recurrenceParentId: null })).toBe(false);
  });
});

describe("ritualLabel", () => {
  it("prints a short stamp", () => {
    expect(ritualLabel("daily")).toBe("DAILY");
    expect(ritualLabel("weekdays")).toBe("WEEKDAYS");
    expect(ritualLabel("weekly:MON")).toBe("MON");
    expect(ritualLabel(null)).toBe("RITUAL");
  });
});

describe("ritualsForDay", () => {
  it("shows the open instance on its due day", () => {
    const shown = ritualsForDay(series, "2026-08-21", "2026-08-21");
    expect(shown.map((todo) => todo.id)).toEqual(["open"]);
  });

  it("keeps a completed ritual visible on the day it was done", () => {
    const shown = ritualsForDay(series, "2026-08-20", "2026-08-21");
    expect(shown.map((todo) => todo.id)).toEqual(["root"]);
  });

  it("surfaces a missed open ritual on today, not in a backlog", () => {
    const missed = [{ ...series[1], dueDate: "2026-08-19" }];
    const shown = ritualsForDay(missed, "2026-08-21", "2026-08-21");
    expect(shown.map((todo) => todo.id)).toEqual(["open"]);
  });

  it("shows a daily ritual on a future day the rule still fires", () => {
    expect(ritualsForDay(series, "2026-08-22", "2026-08-21").map((todo) => todo.id)).toEqual(["open"]);
  });

  it("does not project a weekdays ritual onto a weekend", () => {
    const weekdays = [{ ...series[1], recurrenceRule: "weekdays" as const }];
    expect(ritualsForDay(weekdays, "2026-08-22", "2026-08-21")).toEqual([]);
  });

  it("shows an undated open ritual on today so it is not lost in Someday", () => {
    const floating = [{ ...series[1], dueDate: null }];
    expect(ritualsForDay(floating, "2026-08-21", "2026-08-21").map((todo) => todo.id)).toEqual(["open"]);
  });

  it("hides one-shots", () => {
    const once = { ...series[1], id: "once", recurrenceRule: null, recurrenceParentId: null };
    expect(ritualsForDay([once], "2026-08-21", "2026-08-21")).toEqual([]);
  });
});

describe("oneShotsForDay", () => {
  it("returns dated one-shots and excludes rituals and overdue rituals", () => {
    const once = {
      id: "once",
      title: "Call",
      state: "OPEN",
      dueDate: "2026-08-21",
      completedAt: null,
      recurrenceRule: null,
      recurrenceParentId: null,
      seriesPosition: null,
    };
    const overdueOnce = { ...once, id: "late", dueDate: "2026-08-19" };
    expect(oneShotsForDay([...series, once, overdueOnce], "2026-08-21", "2026-08-21", "open").map((t) => t.id)).toEqual([
      "once",
    ]);
    expect(oneShotsForDay([...series, once, overdueOnce], "2026-08-21", "2026-08-21", "overdue").map((t) => t.id)).toEqual([
      "late",
    ]);
  });
});

describe("ritualWeekMarks", () => {
  it("marks done, open, miss, and future due days for a daily ritual", () => {
    const marks = ritualWeekMarks(
      ["2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22"],
      "2026-08-21",
      "daily",
      series
    );
    expect(marks.map((mark) => mark.mark)).toEqual(["miss", "miss", "miss", "miss", "done", "open", "due"]);
  });
});
