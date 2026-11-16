import { describe, expect, it } from "vitest";
import {
  computeStatsOverview,
  computeVelocityProjection,
  parseStatsRange,
  type StatsBookmarkInput,
  type StatsTilInput,
} from "./computeStats";

const EMPTY_NOTEBOOKS = {
  courses: 0,
  lessons: 0,
  writtenLessons: 0,
  stubLessons: 0,
  watchedUnwrittenLessons: 0,
  unstartedLessons: 0,
  totalWords: 0,
  collisions: 0,
};

const EMPTY_READING = {
  booksTotal: 0,
  booksReading: 0,
  booksCompleted: 0,
  marginaliaCount: 0,
  marginaliaPromotedCount: 0,
};

const EMPTY_OUTPUT = {
  todosDoneInRange: 0,
  todosOpen: 0,
  focusMinutesInRange: 0,
  studioTotalPieces: 0,
  studioInFlight: 0,
  studioReady: 0,
  studioPosted: 0,
  studioIdeasOpen: 0,
  scratchOpen: 0,
  scratchTotal: 0,
};

function makeBookmark(overrides: Partial<StatsBookmarkInput> = {}): StatsBookmarkInput {
  return {
    id: 1,
    title: "Sample",
    type: "ART",
    source: "example.com",
    url: "https://example.com/a",
    mins: 10,
    collectionId: "c1",
    unread: true,
    itemType: "QUEUED",
    useCount: 0,
    lastUsedAt: null,
    parentId: null,
    deletedAt: null,
    createdAt: new Date("2026-11-10T12:00:00Z"),
    updatedAt: new Date("2026-11-10T12:00:00Z"),
    ...overrides,
  };
}

function makeTil(overrides: Partial<StatsTilInput> = {}): StatsTilInput {
  return {
    id: "t1",
    type: "FACT",
    loggedFor: "2026-11-15",
    dischargesBookmarkId: null,
    supersededById: null,
    createdAt: new Date("2026-11-15T12:00:00Z"),
    ...overrides,
  };
}

describe("parseStatsRange", () => {
  it("accepts valid ranges and falls back to 90d", () => {
    expect(parseStatsRange("30d")).toBe("30d");
    expect(parseStatsRange("90d")).toBe("90d");
    expect(parseStatsRange("all")).toBe("all");
    expect(parseStatsRange("7d")).toBe("90d");
    expect(parseStatsRange(null)).toBe("90d");
  });
});

describe("computeVelocityProjection", () => {
  it("reports clear queue when unread is zero instead of inventing 14 months", () => {
    const res = computeVelocityProjection({
      unreadCount: 0,
      avgSavedPerWeek: 1.5,
      avgClearedPerWeek: 1.5,
      avgTilPerWeek: 2,
      windowWeeks: 8,
    });
    expect(res.status).toBe("clear");
    expect(res.weeksToClearAtNet).toBe(0);
    expect(res.headline).toContain("clear");
  });

  it("reports stalled when unread > 0 and zero cleared", () => {
    const res = computeVelocityProjection({
      unreadCount: 12,
      avgSavedPerWeek: 2,
      avgClearedPerWeek: 0,
      avgTilPerWeek: 0,
      windowWeeks: 8,
    });
    expect(res.status).toBe("stalled");
    expect(res.weeksToClearAtNet).toBeNull();
    expect(res.headline).toContain("No items completed");
  });

  it("reports growing when intake exceeds clearance", () => {
    const res = computeVelocityProjection({
      unreadCount: 20,
      avgSavedPerWeek: 4,
      avgClearedPerWeek: 2,
      avgTilPerWeek: 1,
      windowWeeks: 8,
    });
    expect(res.status).toBe("growing");
    expect(res.netWeeklyBurn).toBe(-2);
    expect(res.weeksToClearAtNet).toBeNull();
    expect(res.weeksToClearSolo).toBe(10);
  });

  it("reports shrinking horizon accurately when clearance beats intake", () => {
    const res = computeVelocityProjection({
      unreadCount: 12,
      avgSavedPerWeek: 1,
      avgClearedPerWeek: 3,
      avgTilPerWeek: 2,
      windowWeeks: 8,
    });
    expect(res.status).toBe("shrinking");
    expect(res.netWeeklyBurn).toBe(2);
    expect(res.weeksToClearAtNet).toBe(6);
    expect(res.headline).toContain("6 weeks");
  });
});

describe("computeStatsOverview", () => {
  const now = new Date("2026-11-16T18:00:00Z");

  it("returns zeroed honest defaults for an empty library", () => {
    const stats = computeStatsOverview({
      range: "90d",
      timezone: "UTC",
      now,
      bookmarks: [],
      collections: [],
      tils: [],
      useEvents: [],
      streak: { currentStreak: 0, longestStreak: 0, streakAtRisk: true, skipsUsedThisMonth: 0 },
      notebooks: EMPTY_NOTEBOOKS,
      reading: EMPTY_READING,
      output: EMPTY_OUTPUT,
    });

    expect(stats.library.total).toBe(0);
    expect(stats.library.readPercent).toBe(0);
    expect(stats.engagement.neverOpenedPct).toBe(0);
    expect(stats.synthesis.tilTotal).toBe(0);
    expect(stats.synthesis.dischargeRateInRange).toBe(0);
    expect(stats.synthesis.streak.currentStreak).toBe(0);
    expect(stats.velocity.status).toBe("clear");
    expect(stats.weeklyFlow).toHaveLength(8);
    expect(stats.activityDays).toHaveLength(98);
  });

  it("excludes soft-deleted and child chapter bookmarks from top-level inventory", () => {
    const stats = computeStatsOverview({
      range: "30d",
      timezone: "UTC",
      now,
      bookmarks: [
        makeBookmark({ id: 1, unread: false, itemType: "QUEUED", useCount: 3, mins: 15 }),
        makeBookmark({ id: 2, unread: true, itemType: "REFERENCE", useCount: 0, mins: 20 }),
        makeBookmark({ id: 3, parentId: 1, unread: true, mins: 5 }), // chapter
        makeBookmark({ id: 4, deletedAt: new Date("2026-11-11T00:00:00Z"), mins: 99 }), // deleted
      ],
      collections: [{ id: "c1", name: "Systems", color: "#4895B8" }],
      tils: [
        makeTil({ id: "a", loggedFor: "2026-11-15", dischargesBookmarkId: 1 }),
        makeTil({ id: "b", loggedFor: "2026-11-14", dischargesBookmarkId: null }),
        makeTil({ id: "c", loggedFor: "2026-08-01", dischargesBookmarkId: 1 }), // outside 30d
        makeTil({ id: "d", loggedFor: "2026-11-15", supersededById: "a", dischargesBookmarkId: 1 }), // superseded
      ],
      useEvents: [
        { bookmarkId: 1, usedAt: new Date("2026-11-15T10:00:00Z") },
        { bookmarkId: 1, usedAt: new Date("2026-11-12T10:00:00Z") },
      ],
      streak: { currentStreak: 2, longestStreak: 5, streakAtRisk: false, skipsUsedThisMonth: 0 },
      notebooks: EMPTY_NOTEBOOKS,
      reading: EMPTY_READING,
      output: EMPTY_OUTPUT,
    });

    expect(stats.library.total).toBe(2);
    expect(stats.library.queuedCount).toBe(1);
    expect(stats.library.referenceCount).toBe(1);
    expect(stats.library.readCount).toBe(1);
    expect(stats.library.unreadCount).toBe(1);
    expect(stats.library.unreadQueuedCount).toBe(0);
    expect(stats.library.unreadReferenceCount).toBe(1);
    expect(stats.library.totalMins).toBe(35);

    expect(stats.engagement.openedCount).toBe(1);
    expect(stats.engagement.neverOpenedCount).toBe(1);
    expect(stats.engagement.reachesInRange).toBe(2);

    // 3 active TILs all time (superseded excluded), 2 in 30d range
    expect(stats.synthesis.tilTotal).toBe(3);
    expect(stats.synthesis.tilInRange).toBe(2);
    expect(stats.synthesis.tilDischargedInRange).toBe(1);
    expect(stats.synthesis.dischargeRateInRange).toBe(50);
    expect(stats.synthesis.dischargedBookmarksCount).toBe(1);

    // Coldest items lists never-opened bookmark #2
    expect(stats.coldestItems).toHaveLength(1);
    expect(stats.coldestItems[0].id).toBe(2);

    // Activity grid picks up TIL + reach on 2026-11-15
    const nov15 = stats.activityDays.find((d) => d.date === "2026-11-15");
    expect(nov15).toEqual({ date: "2026-11-15", tils: 1, reaches: 1, total: 2 });
  });
});
