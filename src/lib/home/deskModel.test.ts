import { describe, expect, it } from "vitest";
import {
  displayedReach,
  formatResumeLeftAt,
  isUnfiledCollection,
  kindChip,
  rankReached,
  resumeCrumb,
  resumePoint,
  shelfDisplayName,
  spineSize,
  ticksFilled,
  tilWhenLabel,
  wearFromCounts,
} from "./deskModel";

describe("isUnfiledCollection", () => {
  it("treats unsorted / unfiled / inbox as unfiled", () => {
    expect(isUnfiledCollection("ab12-unsorted", "Unsorted")).toBe(true);
    expect(isUnfiledCollection("ab12-unfiled", "Loose")).toBe(true);
    expect(isUnfiledCollection("inbox", "Inbox")).toBe(true);
    expect(isUnfiledCollection("ab12-ai", "AI Engineering")).toBe(false);
  });
});

describe("shelfDisplayName", () => {
  it("relabels the unfiled spine", () => {
    expect(shelfDisplayName("Unsorted", true)).toBe("UNFILED");
    expect(shelfDisplayName("AI Engineering", false)).toBe("AI Engineering");
  });
});

describe("spineSize", () => {
  it("scales width and height with count", () => {
    const small = spineSize(10, 100);
    const large = spineSize(100, 100);
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBeGreaterThan(small.height);
    expect(spineSize(0, 0)).toEqual({ width: 28, height: 78 });
  });
});

describe("wearFromCounts", () => {
  it("normalizes against the highest count", () => {
    expect(wearFromCounts([47, 31, 0])).toEqual([1, 31 / 47, 0]);
    expect(wearFromCounts([0, 0])).toEqual([0, 0]);
  });
});

describe("ticksFilled", () => {
  it("fills ticks from wear and never shows a lone empty row as half-full", () => {
    expect(ticksFilled(0)).toBe(0);
    expect(ticksFilled(1)).toBe(8);
    expect(ticksFilled(0.5)).toBe(4);
    expect(ticksFilled(0.01)).toBe(1);
  });
});

describe("resumePoint", () => {
  it("returns null when there is no saved progress", () => {
    expect(resumePoint({ extra: {}, chapterIndex: null, startTimeSec: 0 })).toBeNull();
    expect(
      resumePoint({
        extra: { coverData: { kind: "VIDEO", chapterOffsets: [0, 0.4], watchedFraction: 0 } },
      }),
    ).toBeNull();
  });

  it("reads a real resume mark from cover data, chapter, or timestamp", () => {
    expect(
      resumePoint({
        extra: { coverData: { kind: "VIDEO", chapterOffsets: [0, 0.4, 0.8], watchedFraction: 0.5 } },
      }),
    ).toBe("chapter 3");
    expect(
      resumePoint({
        extra: { coverData: { kind: "PAPER", pages: 20, pagesRead: 7 } },
      }),
    ).toBe("page 7");
    expect(resumePoint({ chapterTitle: "networking namespaces" })).toBe("networking namespaces");
    expect(resumePoint({ startTimeSec: 125 })).toBe("2:05");
  });
});

describe("resumeCrumb", () => {
  it("joins collection, left-at, and session count", () => {
    expect(resumeCrumb("INFRA & DEVOPS", "networking namespaces", 3)).toBe(
      "INFRA & DEVOPS · left at 'networking namespaces' · 3 sessions in",
    );
    expect(formatResumeLeftAt("  foo  ")).toBe("left at 'foo'");
  });
});

describe("rankReached", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it("ranks on the 60-day window, not all-time useCount", () => {
    const ranked = rankReached(
      [
        { id: 1, reach60: 2, lastUsedAt: daysAgo(3), useCount: 400 },
        { id: 2, reach60: 11, lastUsedAt: daysAgo(1), useCount: 12 },
        { id: 3, reach60: 0, lastUsedAt: daysAgo(90), useCount: 999 },
      ],
      now,
    );
    expect(ranked.map((item) => item.id)).toEqual([2, 1]);
  });

  it("falls back to recency inside the window when no event counts exist", () => {
    const ranked = rankReached(
      [
        { id: 1, reach60: 0, lastUsedAt: daysAgo(40), useCount: 80 },
        { id: 2, reach60: 0, lastUsedAt: daysAgo(2), useCount: 4 },
        { id: 3, reach60: 0, lastUsedAt: daysAgo(70), useCount: 200 },
      ],
      now,
    );
    expect(ranked.map((item) => item.id)).toEqual([2, 1]);
    expect(displayedReach(ranked[0])).toBe(4);
  });
});

describe("kindChip", () => {
  it("maps library kinds onto the mock chips", () => {
    expect(kindChip("GIT")).toEqual({ label: "REPO", tone: "git" });
    expect(kindChip("ART")).toEqual({ label: "ARTICLE", tone: "art" });
  });
});

describe("tilWhenLabel", () => {
  it("labels today and yesterday without a duration", () => {
    expect(tilWhenLabel("2026-08-21", "2026-08-21", "2026-08-20")).toBe("TODAY");
    expect(tilWhenLabel("2026-08-20", "2026-08-21", "2026-08-20")).toBe("YESTERDAY");
    expect(tilWhenLabel("2026-05-02", "2026-08-21", "2026-08-20")).toBe("2026-05-02");
  });
});
