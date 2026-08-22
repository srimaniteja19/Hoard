import { describe, expect, it } from "vitest";
import { countOpenByDue, monthCells, shiftMonth } from "./calendar";

describe("monthCells", () => {
  it("returns 42 cells covering the visible month", () => {
    const cells = monthCells(2026, 8);
    expect(cells).toHaveLength(42);
    expect(cells.filter((cell) => cell.inMonth).map((cell) => cell.date.slice(-2))).toContain("01");
    expect(cells.filter((cell) => cell.inMonth).map((cell) => cell.date.slice(-2))).toContain("31");
    expect(cells[0]?.inMonth).toBe(false);
  });
});

describe("shiftMonth", () => {
  it("wraps the year", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("countOpenByDue", () => {
  it("counts only open dated tasks", () => {
    expect(
      countOpenByDue([
        { dueDate: "2026-08-21", state: "OPEN" },
        { dueDate: "2026-08-21", state: "OPEN" },
        { dueDate: "2026-08-21", state: "DONE" },
        { dueDate: null, state: "OPEN" },
      ])
    ).toEqual({ "2026-08-21": 2 });
  });
});
