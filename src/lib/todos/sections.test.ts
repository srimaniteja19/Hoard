import { describe, it, expect } from "vitest";
import { sectionTodos, computeSeriesStats } from "./sections";
import { Todo } from "./types";

let seq = 0;
function makeTodo(overrides: Partial<Todo> = {}): Todo {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Todo ${seq}`,
    note: null,
    energy: "SHALLOW",
    estimatedMinutes: 25,
    actualMinutes: null,
    dueDate: null,
    rolloverCount: 0,
    remindAt: null,
    recurrenceRule: null,
    recurrenceParentId: null,
    seriesPosition: null,
    state: "OPEN",
    completedAt: null,
    tags: [],
    subtasks: [],
    ...overrides,
  };
}

const TODAY = "2024-01-15";

describe("sectionTodos — partitioning by due date and state", () => {
  it("puts an OPEN todo due before today in overdue", () => {
    const t = makeTodo({ dueDate: "2024-01-10" });
    const s = sectionTodos([t], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.overdue).toEqual([t]);
  });

  it("puts an OPEN todo due exactly today in dueToday", () => {
    const t = makeTodo({ dueDate: TODAY });
    const s = sectionTodos([t], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.dueToday).toEqual([t]);
  });

  it("puts an OPEN todo due within the next 7 days in thisWeek, inclusive of day 7", () => {
    const t = makeTodo({ dueDate: "2024-01-22" }); // today + 7
    const s = sectionTodos([t], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.thisWeek).toEqual([t]);
    expect(s.later).toEqual([]);
  });

  it("puts an OPEN todo due after the week window in later", () => {
    const t = makeTodo({ dueDate: "2024-01-23" }); // today + 8
    const s = sectionTodos([t], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.later).toEqual([t]);
  });

  it("puts an OPEN todo with no due date in someday", () => {
    const t = makeTodo({ dueDate: null });
    const s = sectionTodos([t], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.someday).toEqual([t]);
  });

  it("puts a DONE todo completed today in doneToday, by local calendar day not raw instant", () => {
    const t = makeTodo({ state: "DONE", completedAt: `${TODAY}T23:59:00` });
    const s = sectionTodos([t], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.doneToday).toEqual([t]);
  });

  it("excludes a DONE todo completed on a different day from doneToday", () => {
    const t = makeTodo({ state: "DONE", completedAt: "2024-01-14T10:00:00" });
    const s = sectionTodos([t], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.doneToday).toEqual([]);
  });

  it("excludes GRAVEYARD and DROPPED todos from every section", () => {
    const grave = makeTodo({ state: "GRAVEYARD", dueDate: TODAY });
    const dropped = makeTodo({ state: "DROPPED", dueDate: TODAY });
    const s = sectionTodos([grave, dropped], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.overdue).toEqual([]);
    expect(s.dueToday).toEqual([]);
    expect(s.thisWeek).toEqual([]);
    expect(s.later).toEqual([]);
    expect(s.someday).toEqual([]);
    expect(s.doneToday).toEqual([]);
  });
});

describe("sectionTodos — energy and time filters", () => {
  it("excludes todos that don't match the energy filter", () => {
    const deep = makeTodo({ dueDate: TODAY, energy: "DEEP" });
    const errand = makeTodo({ dueDate: TODAY, energy: "ERRAND" });
    const s = sectionTodos([deep, errand], { today: TODAY, time: 180, energyFilter: "DEEP" });
    expect(s.dueToday).toEqual([deep]);
  });

  it("excludes todos longer than the time filter when time < 180 (the 'any time' sentinel)", () => {
    const short = makeTodo({ dueDate: TODAY, estimatedMinutes: 10 });
    const long = makeTodo({ dueDate: TODAY, estimatedMinutes: 90 });
    const s = sectionTodos([short, long], { today: TODAY, time: 30, energyFilter: "ALL" });
    expect(s.dueToday).toEqual([short]);
  });

  it("does not filter by time when time is 180 (any time)", () => {
    const long = makeTodo({ dueDate: TODAY, estimatedMinutes: 175 });
    const s = sectionTodos([long], { today: TODAY, time: 180, energyFilter: "ALL" });
    expect(s.dueToday).toEqual([long]);
  });

  it("totalOpen counts every OPEN todo regardless of the energy/time filter", () => {
    const deep = makeTodo({ dueDate: TODAY, energy: "DEEP", estimatedMinutes: 90 });
    const errand = makeTodo({ dueDate: TODAY, energy: "ERRAND", estimatedMinutes: 5 });
    const done = makeTodo({ state: "DONE" });
    const s = sectionTodos([deep, errand, done], { today: TODAY, time: 10, energyFilter: "ERRAND" });
    expect(s.dueToday).toEqual([errand]); // filtered view only shows the errand
    expect(s.totalOpen).toBe(2); // but the unfiltered OPEN count still sees both
  });
});

describe("computeSeriesStats", () => {
  it("counts DONE instances as done and DROPPED as missed", () => {
    const root = makeTodo({ id: "root", seriesPosition: 0, state: "DONE" });
    const missed = makeTodo({ recurrenceParentId: "root", seriesPosition: 1, state: "DROPPED" });
    const stats = computeSeriesStats([root, missed], "root");
    expect(stats.done).toBe(1);
    expect(stats.missed).toBe(1);
  });

  it("counts a trailing run of DONE instances, letting the current OPEN instance not break it", () => {
    const t0 = makeTodo({ id: "root", seriesPosition: 0, state: "DONE" });
    const t1 = makeTodo({ recurrenceParentId: "root", seriesPosition: 1, state: "DONE" });
    const t2 = makeTodo({ recurrenceParentId: "root", seriesPosition: 2, state: "OPEN" });
    const stats = computeSeriesStats([t0, t1, t2], "root");
    expect(stats.run).toBe(2);
  });

  it("a DROPPED instance at the end breaks the run", () => {
    const t0 = makeTodo({ id: "root", seriesPosition: 0, state: "DONE" });
    const t1 = makeTodo({ recurrenceParentId: "root", seriesPosition: 1, state: "DROPPED" });
    const stats = computeSeriesStats([t0, t1], "root");
    expect(stats.run).toBe(0);
  });

  it("ignores todos outside the series", () => {
    const root = makeTodo({ id: "root", seriesPosition: 0, state: "DONE" });
    const other = makeTodo({ id: "unrelated", state: "DONE" });
    const stats = computeSeriesStats([root, other], "root");
    expect(stats.done).toBe(1);
  });
});
