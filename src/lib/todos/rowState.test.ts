import { describe, it, expect } from "vitest";
import { deriveTodoFlags, GRAVEYARD_THRESHOLD } from "./rowState";
import { Todo } from "./types";

const TODAY = "2024-01-15";

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "t1",
    title: "Todo",
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

describe("deriveTodoFlags — isOverdue / daysOverdue", () => {
  it("is not overdue when there's no due date", () => {
    const flags = deriveTodoFlags(makeTodo({ dueDate: null }), TODAY);
    expect(flags.isOverdue).toBe(false);
    expect(flags.daysOverdue).toBe(0);
  });

  it("is not overdue when due today", () => {
    const flags = deriveTodoFlags(makeTodo({ dueDate: TODAY }), TODAY);
    expect(flags.isOverdue).toBe(false);
  });

  it("is overdue when due before today, and counts the days", () => {
    const flags = deriveTodoFlags(makeTodo({ dueDate: "2024-01-10" }), TODAY);
    expect(flags.isOverdue).toBe(true);
    expect(flags.daysOverdue).toBe(5);
  });

  it("is never overdue once DONE, even with a past due date", () => {
    const flags = deriveTodoFlags(makeTodo({ dueDate: "2024-01-10", state: "DONE" }), TODAY);
    expect(flags.isOverdue).toBe(false);
  });
});

describe("deriveTodoFlags — isStale", () => {
  it("is not stale below the threshold", () => {
    expect(deriveTodoFlags(makeTodo({ rolloverCount: 2 }), TODAY).isStale).toBe(false);
  });

  it("is stale at the threshold", () => {
    expect(deriveTodoFlags(makeTodo({ rolloverCount: 3 }), TODAY).isStale).toBe(true);
  });
});

describe("deriveTodoFlags — offerGraveyard", () => {
  it("does not offer the graveyard below GRAVEYARD_THRESHOLD", () => {
    const flags = deriveTodoFlags(makeTodo({ rolloverCount: GRAVEYARD_THRESHOLD - 1 }), TODAY);
    expect(flags.offerGraveyard).toBe(false);
  });

  it("offers the graveyard at GRAVEYARD_THRESHOLD", () => {
    const flags = deriveTodoFlags(makeTodo({ rolloverCount: GRAVEYARD_THRESHOLD }), TODAY);
    expect(flags.offerGraveyard).toBe(true);
  });

  it("never offers the graveyard for a non-OPEN todo, regardless of rolloverCount", () => {
    const flags = deriveTodoFlags(makeTodo({ rolloverCount: GRAVEYARD_THRESHOLD, state: "DONE" }), TODAY);
    expect(flags.offerGraveyard).toBe(false);
  });
});
