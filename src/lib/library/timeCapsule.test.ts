import { describe, it, expect } from "vitest";
import {
  classifyHorizon,
  getDaysAgo,
  getBookmarkDate,
  buildTimeCapsuleNudges,
  getHorizonSummaries,
} from "./timeCapsule";
import { Bookmark } from "@/types";

describe("Time Capsule & Memory Nudges", () => {
  const baseDate = new Date("2026-08-23T12:00:00.000Z");

  it("classifies daysAgo correctly into horizons", () => {
    expect(classifyHorizon(0)).toBeNull(); // today
    expect(classifyHorizon(1)).toBe("yesterday");
    expect(classifyHorizon(2)).toBe("yesterday");
    expect(classifyHorizon(7)).toBe("lastWeek");
    expect(classifyHorizon(9)).toBe("lastWeek");
    expect(classifyHorizon(30)).toBe("lastMonth");
    expect(classifyHorizon(60)).toBe("earlier");
  });

  it("calculates daysAgo between dates", () => {
    const yesterday = new Date("2026-08-22T12:00:00.000Z");
    const lastWeek = new Date("2026-08-16T12:00:00.000Z");
    const lastMonth = new Date("2026-07-23T12:00:00.000Z");

    expect(getDaysAgo(yesterday, baseDate)).toBe(1);
    expect(getDaysAgo(lastWeek, baseDate)).toBe(7);
    expect(getDaysAgo(lastMonth, baseDate)).toBe(31);
  });

  it("parses bookmark dates from createdAt or when fallback", () => {
    const b1: Bookmark = {
      id: 1,
      t: "Item 1",
      ty: "ART",
      src: "example.com",
      url: "https://example.com/1",
      mins: 5,
      tag: "test",
      coll: "all",
      when: "Aug 22",
      createdAt: "2026-08-22T10:00:00.000Z",
      unread: true,
      ex: {},
      note: "",
    };

    const parsed = getBookmarkDate(b1);
    expect(parsed.toISOString()).toBe("2026-08-22T10:00:00.000Z");
  });

  it("builds nudges and filters out deleted, read, and dismissed items", () => {
    const bookmarks: Bookmark[] = [
      {
        id: 1,
        t: "Yesterday Article",
        ty: "ART",
        src: "news.ycombinator.com",
        url: "https://news.ycombinator.com/1",
        mins: 10,
        tag: "hn",
        coll: "all",
        when: "Aug 22",
        createdAt: "2026-08-22T12:00:00.000Z",
        unread: true,
        ex: {},
        note: "",
      },
      {
        id: 2,
        t: "Last Week Video",
        ty: "VID",
        src: "youtube.com",
        url: "https://youtube.com/2",
        mins: 0,
        tag: "ai",
        coll: "all",
        when: "Aug 16",
        createdAt: "2026-08-16T12:00:00.000Z",
        unread: true,
        ex: {},
        note: "",
      },
      {
        id: 3,
        t: "Last Month Repo",
        ty: "GIT",
        src: "github.com",
        url: "https://github.com/3",
        mins: 0,
        tag: "code",
        coll: "all",
        when: "Jul 24",
        createdAt: "2026-07-24T12:00:00.000Z",
        unread: true,
        ex: {},
        note: "",
      },
      {
        id: 4,
        t: "Read Item (Ignored)",
        ty: "ART",
        src: "read.com",
        url: "https://read.com",
        mins: 5,
        tag: "done",
        coll: "all",
        when: "Aug 22",
        createdAt: "2026-08-22T12:00:00.000Z",
        unread: false,
        ex: {},
        note: "",
      },
      {
        id: 5,
        t: "Dismissed Item",
        ty: "APP",
        src: "app.com",
        url: "https://app.com",
        mins: 0,
        tag: "tools",
        coll: "all",
        when: "Aug 22",
        createdAt: "2026-08-22T12:00:00.000Z",
        unread: true,
        ex: {},
        note: "",
      },
    ];

    const nudges = buildTimeCapsuleNudges(bookmarks, new Set([5]), baseDate);
    expect(nudges).toHaveLength(3);
    expect(nudges.map((n) => n.id)).toEqual([1, 2, 3]);

    const summaries = getHorizonSummaries(nudges);
    expect(summaries.find((s) => s.horizon === "all")?.count).toBe(3);
    expect(summaries.find((s) => s.horizon === "yesterday")?.count).toBe(1);
    expect(summaries.find((s) => s.horizon === "lastWeek")?.count).toBe(1);
    expect(summaries.find((s) => s.horizon === "lastMonth")?.count).toBe(1);
  });
});
