import { describe, it, expect } from "vitest";
import { classify, standfirst } from "./standfirst";
import type { LeadCandidate } from "./types";

const baseTodo: LeadCandidate = {
  source: "todo",
  id: "abc",
  title: "Standup notes",
  estimatedMinutes: 15,
  kind: null,
  energy: "SHALLOW",
  overdueDays: null,
  dueToday: false,
  rolloverCount: 0,
  ageDays: 4,
  unread: null,
};

describe("classify", () => {
  it("picks overdue-todo, then due-today, then moved-repeatedly, then old-unread, else fits", () => {
    expect(classify({ ...baseTodo, overdueDays: 2 })).toBe("overdue-todo");
    expect(classify({ ...baseTodo, dueToday: true })).toBe("due-today");
    expect(classify({ ...baseTodo, rolloverCount: 5 })).toBe("moved-repeatedly");
    expect(
      classify({
        ...baseTodo,
        source: "bookmark",
        kind: "ART",
        unread: true,
        ageDays: 40,
        energy: null,
        rolloverCount: null,
      })
    ).toBe("old-unread");
    expect(classify(baseTodo)).toBe("fits");
  });
});

describe("standfirst", () => {
  it("returns the same line for the same id", () => {
    const a = standfirst(baseTodo, 25);
    const b = standfirst(baseTodo, 25);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("interpolates minutes and rolloverCount", () => {
    const line = standfirst({ ...baseTodo, rolloverCount: 5 }, 25);
    expect(line).toMatch(/5/);
    expect(line).toMatch(/25/);
  });
});
