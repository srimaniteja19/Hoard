import { describe, it, expect } from "vitest";
import { filterCandidates, rankCandidates, score } from "./score";
import type { LeadCandidate } from "./types";

function todo(over: Partial<LeadCandidate> = {}): LeadCandidate {
  return {
    source: "todo",
    id: "t1",
    title: "File expenses",
    estimatedMinutes: 25,
    kind: null,
    energy: "ERRAND",
    overdueDays: 3,
    dueToday: false,
    rolloverCount: 0,
    ageDays: 10,
    unread: null,
    ...over,
  };
}

function bookmark(over: Partial<LeadCandidate> = {}): LeadCandidate {
  return {
    source: "bookmark",
    id: "99",
    title: "Some article",
    estimatedMinutes: 25,
    kind: "ART",
    energy: null,
    overdueDays: null,
    dueToday: false,
    rolloverCount: null,
    ageDays: 40,
    unread: true,
    ...over,
  };
}

describe("filterCandidates", () => {
  it("keeps every todo and only bookmarks whose kind is in CTX[ctx]", () => {
    const pool = [todo(), bookmark({ kind: "VID", id: "v" }), bookmark({ kind: "GIT", id: "g" })];
    const commute = filterCandidates(pool, "commute");
    expect(commute.map((c) => c.id).sort()).toEqual(["t1", "v"]);
  });

  it("returns the full pool for ctx=all", () => {
    const pool = [todo(), bookmark()];
    expect(filterCandidates(pool, "all")).toHaveLength(2);
  });
});

describe("rankCandidates", () => {
  it("ranks an overdue todo above a same-length bookmark", () => {
    const ranked = rankCandidates([bookmark(), todo()], 25, null);
    expect(ranked[0].source).toBe("todo");
  });

  it("ignores fit when minutes is 180 and tie-breaks to the older item", () => {
    const young = todo({ id: "y", estimatedMinutes: 10, overdueDays: null, dueToday: false, ageDays: 2 });
    const old = todo({ id: "o", estimatedMinutes: 120, overdueDays: null, dueToday: false, ageDays: 40 });
    expect(score(young, 180, null)).toBe(score(old, 180, null));
    const ranked = rankCandidates([young, old], 180, null);
    expect(ranked[0].id).toBe("o");
  });

  it("applies a 0.6 variety penalty to the last-led id", () => {
    const a = todo({ id: "a", overdueDays: null, dueToday: true });
    const b = todo({ id: "b", overdueDays: null, dueToday: true, ageDays: 11 });
    expect(score(a, 25, "a")).toBeCloseTo(score(a, 25, null) * 0.6);
    const ranked = rankCandidates([a, b], 25, "a");
    expect(ranked[0].id).toBe("b");
  });

  it("returns [] for an empty pool", () => {
    expect(rankCandidates([], 25, null)).toEqual([]);
  });
});
