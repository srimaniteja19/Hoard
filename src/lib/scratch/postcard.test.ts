import { describe, it, expect } from "vitest";
import { getWeekBounds, computePostcardData } from "./postcard";
import { ScrapRow } from "@/db/schema";

function mockScrap(partial: Partial<ScrapRow>): ScrapRow {
  return {
    id: "s1",
    userId: "u1",
    content: "Sample content",
    kind: "FRAGMENT",
    color: "cyan",
    tilt: "0deg",
    notes: "",
    status: "raw",
    statusLabel: "RAW",
    promotedTo: null,
    promotedId: null,
    threadN: 0,
    threadSummary: null,
    weldedToId: null,
    loggedFor: "2026-08-19",
    occurredOn: "2026-08-19",
    entities: {},
    tags: [],
    isBuried: false,
    buriedAt: null,
    createdAt: new Date("2026-08-19T10:00:00Z"),
    updatedAt: new Date("2026-08-19T10:00:00Z"),
    ...partial,
  };
}

describe("getWeekBounds", () => {
  it("computes Monday-Sunday for a mid-week date", () => {
    // Wednesday 2026-08-19
    const bounds = getWeekBounds(new Date("2026-08-19T12:00:00"));
    expect(bounds.weekStart).toBe("2026-08-17"); // Monday
    expect(bounds.weekEnd).toBe("2026-08-23"); // Sunday
  });

  it("treats a Monday as the start of its own week", () => {
    const bounds = getWeekBounds(new Date("2026-08-17T12:00:00"));
    expect(bounds.weekStart).toBe("2026-08-17");
    expect(bounds.weekEnd).toBe("2026-08-23");
  });

  it("treats a Sunday as the end of its own week", () => {
    const bounds = getWeekBounds(new Date("2026-08-23T12:00:00"));
    expect(bounds.weekStart).toBe("2026-08-17");
    expect(bounds.weekEnd).toBe("2026-08-23");
  });

  it("handles a week spanning a month boundary", () => {
    // Wednesday 2026-09-02
    const bounds = getWeekBounds(new Date("2026-09-02T12:00:00"));
    expect(bounds.weekStart).toBe("2026-08-31"); // Monday
    expect(bounds.weekEnd).toBe("2026-09-06"); // Sunday
  });
});

describe("computePostcardData", () => {
  it("tallies scraps by kind and counts total", () => {
    const scraps = [
      mockScrap({ id: "1", kind: "FRAGMENT" }),
      mockScrap({ id: "2", kind: "FRAGMENT" }),
      mockScrap({ id: "3", kind: "QUESTION" }),
    ];
    const data = computePostcardData(scraps);
    expect(data.kindTallies).toEqual({ FRAGMENT: 2, QUESTION: 1 });
    expect(data.totalCount).toBe(3);
  });

  it("counts distinct loggedFor days for daysLogged", () => {
    const scraps = [
      mockScrap({ id: "1", loggedFor: "2026-08-17" }),
      mockScrap({ id: "2", loggedFor: "2026-08-17" }),
      mockScrap({ id: "3", loggedFor: "2026-08-18" }),
    ];
    const data = computePostcardData(scraps);
    expect(data.daysLogged).toBe(2);
  });

  it("returns zeroed data for an empty week", () => {
    const data = computePostcardData([]);
    expect(data.kindTallies).toEqual({});
    expect(data.totalCount).toBe(0);
    expect(data.daysLogged).toBe(0);
    expect(data.highlight).toBeNull();
  });

  it("picks the longest QUOTE scrap as highlight (priority 1)", () => {
    const scraps = [
      mockScrap({ id: "short-quote", kind: "QUOTE", content: "Short." }),
      mockScrap({ id: "long-quote", kind: "QUOTE", content: "A much longer quote worth featuring." }),
      mockScrap({ id: "pinned-fragment", kind: "FRAGMENT", entities: { isPinned: true, pinnedAt: "2026-08-19T00:00:00Z" } }),
    ];
    const data = computePostcardData(scraps);
    expect(data.highlight).toEqual({
      scrapId: "long-quote",
      content: "A much longer quote worth featuring.",
      kind: "QUOTE",
    });
  });

  it("breaks a QUOTE length tie by earliest createdAt", () => {
    const scraps = [
      mockScrap({
        id: "later",
        kind: "QUOTE",
        content: "Same length!",
        createdAt: new Date("2026-08-19T12:00:00Z"),
      }),
      mockScrap({
        id: "earlier",
        kind: "QUOTE",
        content: "Same length!",
        createdAt: new Date("2026-08-18T08:00:00Z"),
      }),
    ];
    const data = computePostcardData(scraps);
    expect(data.highlight?.scrapId).toBe("earlier");
  });

  it("falls back to the most recently pinned scrap (priority 2) when no QUOTE exists", () => {
    const scraps = [
      mockScrap({
        id: "pinned-early",
        kind: "FRAGMENT",
        entities: { isPinned: true, pinnedAt: "2026-08-17T09:00:00Z" },
      }),
      mockScrap({
        id: "pinned-late",
        kind: "IDEA",
        entities: { isPinned: true, pinnedAt: "2026-08-20T09:00:00Z" },
      }),
    ];
    const data = computePostcardData(scraps);
    expect(data.highlight?.scrapId).toBe("pinned-late");
    expect(data.highlight?.kind).toBe("IDEA");
  });

  it("falls back to the highest-threadN scrap (priority 3) when no QUOTE or pinned scrap exists", () => {
    const scraps = [
      mockScrap({ id: "weld-1", kind: "FRAGMENT", threadN: 1 }),
      mockScrap({ id: "weld-3", kind: "IDEA", threadN: 3 }),
    ];
    const data = computePostcardData(scraps);
    expect(data.highlight?.scrapId).toBe("weld-3");
  });

  it("returns no highlight when nothing matches any priority", () => {
    const scraps = [mockScrap({ id: "plain", kind: "FRAGMENT", threadN: 0 })];
    const data = computePostcardData(scraps);
    expect(data.highlight).toBeNull();
  });
});
