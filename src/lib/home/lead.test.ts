import { describe, it, expect } from "vitest";
import { leadHref, leadDept, normalizeTimeParam } from "./lead";
import type { LeadCandidate } from "./types";

function makeCandidate(overrides: Partial<LeadCandidate> = {}): LeadCandidate {
  return {
    source: "bookmark",
    id: "1",
    title: "Something",
    estimatedMinutes: 10,
    kind: "ART",
    energy: null,
    overdueDays: null,
    dueToday: false,
    rolloverCount: null,
    ageDays: 0,
    unread: true,
    ...overrides,
  };
}

describe("leadHref", () => {
  it("sends a todo lead to /todos", () => {
    expect(leadHref(makeCandidate({ source: "todo", id: "t1" }))).toBe("/todos");
  });

  it("sends a bookmark lead to its reading session", () => {
    expect(leadHref(makeCandidate({ source: "bookmark", id: "42" }))).toBe("/session?id=42");
  });
});

describe("leadDept", () => {
  it("is agenda for a todo", () => {
    expect(leadDept(makeCandidate({ source: "todo" }))).toBe("agenda");
  });

  it("is queue for a bookmark", () => {
    expect(leadDept(makeCandidate({ source: "bookmark" }))).toBe("queue");
  });

  it("is queue when there's no lead at all", () => {
    expect(leadDept(null)).toBe("queue");
  });
});

describe("normalizeTimeParam", () => {
  it("defaults to 180 (any time) when the param is missing or blank", () => {
    expect(normalizeTimeParam(null)).toBe(180);
    expect(normalizeTimeParam("")).toBe(180);
    expect(normalizeTimeParam("  ")).toBe(180);
  });

  it("defaults to 180 for a non-numeric value", () => {
    expect(normalizeTimeParam("banana")).toBe(180);
  });

  it("clamps below 5 up to 5", () => {
    expect(normalizeTimeParam("0")).toBe(5);
    expect(normalizeTimeParam("-20")).toBe(5);
  });

  it("clamps above 180 down to 180", () => {
    expect(normalizeTimeParam("500")).toBe(180);
  });

  it("snaps to the nearest 5-minute step", () => {
    expect(normalizeTimeParam("47")).toBe(45);
    expect(normalizeTimeParam("48")).toBe(50);
  });
});
