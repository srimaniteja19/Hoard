import type { KindType } from "@/types";
import { tilTypeValues, type TilType } from "@/db/schema";
import { getLoggedForDate } from "@/lib/dal/shared";
import { isUnfiledCollection, shelfDisplayName } from "@/lib/home/deskModel";
import type {
  ActivityDayPoint,
  ColdItemRow,
  CollectionStatRow,
  KindStatRow,
  SourceStatRow,
  StatsOverview,
  StatsRange,
  TilTypeStatRow,
  VelocityProjection,
  WeeklyFlowPoint,
} from "./types";

const MS_PER_DAY = 86_400_000;

export const KIND_ORDER: KindType[] = ["ART", "VID", "PLY", "GIT", "APP", "PPR", "DOC"];

export const KIND_NAMES: Record<KindType, string> = {
  ART: "Articles",
  VID: "Videos",
  PLY: "Playlists",
  GIT: "Repos",
  APP: "Apps",
  PPR: "Papers",
  DOC: "Docs",
};

export function parseStatsRange(raw: string | null | undefined): StatsRange {
  if (raw === "30d" || raw === "90d" || raw === "all") return raw;
  return "90d";
}

export function rangeCutoffDate(range: StatsRange, now: Date = new Date()): Date | null {
  if (range === "all") return null;
  const days = range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * MS_PER_DAY);
}

function addDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatWeekLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function parseDomain(source: string, url: string): string {
  const cleanedSource = source.trim().toLowerCase().replace(/^www\./, "");
  if (cleanedSource && cleanedSource.includes(".")) return cleanedSource;
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return cleanedSource || "direct";
  }
}

export interface StatsBookmarkInput {
  id: number;
  title: string;
  type: KindType;
  source: string;
  url: string;
  mins: number;
  collectionId: string;
  unread: boolean;
  itemType: "REFERENCE" | "QUEUED";
  useCount: number;
  lastUsedAt: Date | null;
  parentId: number | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatsCollectionInput {
  id: string;
  name: string;
  color: string;
}

export interface StatsTilInput {
  id: string;
  type: TilType;
  loggedFor: string; // YYYY-MM-DD
  dischargesBookmarkId: number | null;
  supersededById: string | null;
  createdAt: Date;
}

export interface StatsUseEventInput {
  bookmarkId: number;
  usedAt: Date;
}

export interface StatsNotebookInput {
  courses: number;
  lessons: number;
  writtenLessons: number;
  stubLessons: number;
  watchedUnwrittenLessons: number;
  unstartedLessons: number;
  totalWords: number;
  collisions: number;
}

export interface StatsReadingInput {
  booksTotal: number;
  booksReading: number;
  booksCompleted: number;
  marginaliaCount: number;
  marginaliaPromotedCount: number;
}

export interface StatsOutputInput {
  todosDoneInRange: number;
  todosOpen: number;
  focusMinutesInRange: number;
  studioTotalPieces: number;
  studioInFlight: number;
  studioReady: number;
  studioPosted: number;
  studioIdeasOpen: number;
  scratchOpen: number;
  scratchTotal: number;
}

export function computeVelocityProjection(params: {
  unreadCount: number;
  avgSavedPerWeek: number;
  avgClearedPerWeek: number;
  avgTilPerWeek: number;
  windowWeeks: number;
}): VelocityProjection {
  const { unreadCount, avgSavedPerWeek, avgClearedPerWeek, avgTilPerWeek, windowWeeks } = params;
  const netWeeklyBurn = Number((avgClearedPerWeek - avgSavedPerWeek).toFixed(1));
  const weeksToClearSolo =
    unreadCount > 0 && avgClearedPerWeek > 0
      ? Math.ceil(unreadCount / avgClearedPerWeek)
      : null;

  if (unreadCount === 0) {
    return {
      avgSavedPerWeek,
      avgClearedPerWeek,
      avgTilPerWeek,
      netWeeklyBurn,
      weeksToClearAtNet: 0,
      weeksToClearSolo: 0,
      status: "clear",
      headline: "Unread queue is clear.",
      detail:
        avgSavedPerWeek > 0
          ? `Averaging ${avgSavedPerWeek}/wk saved and ${avgClearedPerWeek}/wk cleared over the last ${windowWeeks} weeks.`
          : "No unread items waiting in your library.",
    };
  }

  if (avgClearedPerWeek <= 0) {
    return {
      avgSavedPerWeek,
      avgClearedPerWeek,
      avgTilPerWeek,
      netWeeklyBurn,
      weeksToClearAtNet: null,
      weeksToClearSolo: null,
      status: "stalled",
      headline: `No items completed in the last ${windowWeeks} weeks.`,
      detail:
        avgSavedPerWeek > 0
          ? `Saving ${avgSavedPerWeek}/wk with ${unreadCount} unread items waiting. Finish 1+ item to set a clearance pace.`
          : `${unreadCount} unread items waiting. Finish an item in Library or Session to establish a pace.`,
    };
  }

  if (netWeeklyBurn <= 0) {
    const netGrowth = Math.abs(netWeeklyBurn).toFixed(1);
    return {
      avgSavedPerWeek,
      avgClearedPerWeek,
      avgTilPerWeek,
      netWeeklyBurn,
      weeksToClearAtNet: null,
      weeksToClearSolo,
      status: "growing",
      headline:
        netWeeklyBurn === 0
          ? `Queue holding steady at ${unreadCount} unread items.`
          : `Intake outpaces clearance by +${netGrowth}/wk.`,
      detail: `Clearing ${avgClearedPerWeek}/wk while saving ${avgSavedPerWeek}/wk. Without new saves, the existing ${unreadCount} unread items take ~${weeksToClearSolo}w.`,
    };
  }

  const weeksToClearAtNet = Math.ceil(unreadCount / netWeeklyBurn);
  const horizonText =
    weeksToClearAtNet >= 9
      ? `~${Math.round((weeksToClearAtNet / 4.33) * 10) / 10} months`
      : `~${weeksToClearAtNet} ${weeksToClearAtNet === 1 ? "week" : "weeks"}`;

  return {
    avgSavedPerWeek,
    avgClearedPerWeek,
    avgTilPerWeek,
    netWeeklyBurn,
    weeksToClearAtNet,
    weeksToClearSolo,
    status: "shrinking",
    headline: `At net −${netWeeklyBurn}/wk, unread queue clears in ${horizonText}.`,
    detail: `Clearing ${avgClearedPerWeek}/wk against ${avgSavedPerWeek}/wk saved over the last ${windowWeeks} weeks.`,
  };
}

export function computeStatsOverview(input: {
  range: StatsRange;
  timezone: string;
  now?: Date;
  bookmarks: StatsBookmarkInput[];
  collections: StatsCollectionInput[];
  tils: StatsTilInput[];
  useEvents: StatsUseEventInput[];
  streak: {
    currentStreak: number;
    longestStreak: number;
    streakAtRisk: boolean;
    skipsUsedThisMonth: number;
  };
  notebooks: StatsNotebookInput;
  reading: StatsReadingInput;
  output: StatsOutputInput;
}): StatsOverview {
  const now = input.now ?? new Date();
  const timezone = input.timezone || "UTC";
  const todayStr = getLoggedForDate(timezone, now);
  const cutoff = rangeCutoffDate(input.range, now);
  const cutoffStr = cutoff ? getLoggedForDate(timezone, cutoff) : null;

  // Exclude soft-deleted and child chapter rows from library inventory counts.
  const topBookmarks = input.bookmarks.filter((b) => !b.deletedAt && b.parentId == null);

  const total = topBookmarks.length;
  let queuedCount = 0;
  let referenceCount = 0;
  let addedInRange = 0;
  let readCount = 0;
  let unreadCount = 0;
  let unreadQueuedCount = 0;
  let unreadReferenceCount = 0;
  let totalMins = 0;
  let readMins = 0;
  let unreadMins = 0;
  let unreadQueuedMins = 0;
  let openedCount = 0;
  let neverOpenedCount = 0;
  let totalReaches = 0;

  const kindMap = new Map<KindType, KindStatRow>();
  for (const kind of KIND_ORDER) {
    kindMap.set(kind, {
      kind,
      name: KIND_NAMES[kind],
      total: 0,
      unread: 0,
      neverOpened: 0,
      totalMins: 0,
      unreadMins: 0,
      pct: 0,
    });
  }

  const collMetaMap = new Map<string, StatsCollectionInput>();
  for (const c of input.collections) {
    collMetaMap.set(c.id, c);
  }
  const collStatsMap = new Map<string, CollectionStatRow>();

  const sourceStatsMap = new Map<string, SourceStatRow>();
  const neverOpenedPool: StatsBookmarkInput[] = [];

  for (const b of topBookmarks) {
    const mins = Math.max(0, Number(b.mins) || 0);
    const uses = Math.max(0, Number(b.useCount) || 0);
    const isQueued = b.itemType === "QUEUED";

    if (isQueued) queuedCount++;
    else referenceCount++;

    if (!cutoff || b.createdAt >= cutoff) addedInRange++;

    totalMins += mins;
    if (b.unread) {
      unreadCount++;
      unreadMins += mins;
      if (isQueued) {
        unreadQueuedCount++;
        unreadQueuedMins += mins;
      } else {
        unreadReferenceCount++;
      }
    } else {
      readCount++;
      readMins += mins;
    }

    if (uses > 0) openedCount++;
    else {
      neverOpenedCount++;
      neverOpenedPool.push(b);
    }
    totalReaches += uses;

    const kRow = kindMap.get(b.type);
    if (kRow) {
      kRow.total++;
      if (b.unread) {
        kRow.unread++;
        kRow.unreadMins += mins;
      }
      if (uses === 0) kRow.neverOpened++;
      kRow.totalMins += mins;
    }

    const collMeta = collMetaMap.get(b.collectionId);
    const rawName = collMeta?.name || "Unsorted";
    const unfiled = isUnfiledCollection(b.collectionId, rawName);
    const displayName = shelfDisplayName(rawName, unfiled);
    const existingColl = collStatsMap.get(b.collectionId) ?? {
      id: b.collectionId,
      name: displayName,
      color: collMeta?.color || "var(--cyan)",
      total: 0,
      unread: 0,
      neverOpened: 0,
      totalMins: 0,
      pct: 0,
      isUnfiled: unfiled,
    };
    existingColl.total++;
    if (b.unread) existingColl.unread++;
    if (uses === 0) existingColl.neverOpened++;
    existingColl.totalMins += mins;
    collStatsMap.set(b.collectionId, existingColl);

    const domain = parseDomain(b.source, b.url);
    const srcRow = sourceStatsMap.get(domain) ?? {
      domain,
      total: 0,
      unread: 0,
      reaches: 0,
    };
    srcRow.total++;
    if (b.unread) srcRow.unread++;
    srcRow.reaches += uses;
    sourceStatsMap.set(domain, srcRow);
  }

  const readPercent = total > 0 ? Math.round((readCount / total) * 100) : 0;
  const neverOpenedPct = total > 0 ? Math.round((neverOpenedCount / total) * 1000) / 10 : 0;

  const kinds = Array.from(kindMap.values())
    .map((row) => ({
      ...row,
      pct: total > 0 ? Math.round((row.total / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const collections = Array.from(collStatsMap.values())
    .map((row) => ({
      ...row,
      pct: total > 0 ? Math.round((row.total / total) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.isUnfiled !== b.isUnfiled) return a.isUnfiled ? 1 : -1;
      return b.total - a.total;
    });

  const topSources = Array.from(sourceStatsMap.values())
    .sort((a, b) => {
      if (b.reaches !== a.reaches) return b.reaches - a.reaches;
      return b.total - a.total;
    })
    .slice(0, 6);

  const coldestItems: ColdItemRow[] = neverOpenedPool
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      title: b.title,
      kind: b.type,
      source: parseDomain(b.source, b.url),
      mins: Math.max(0, Number(b.mins) || 0),
      savedOn: getLoggedForDate(timezone, b.createdAt),
    }));

  // Reaches in range (prefer bookmark_uses events when available; fall back to bookmark lastUsedAt).
  const useEventsInRange = input.useEvents.filter((ev) => !cutoff || ev.usedAt >= cutoff);
  const reachesInRange =
    input.useEvents.length > 0
      ? useEventsInRange.length
      : topBookmarks.filter((b) => b.lastUsedAt && (!cutoff || b.lastUsedAt >= cutoff)).length;

  // TIL metrics (all non-superseded entries, never truncated).
  const activeTils = input.tils.filter((t) => !t.supersededById);
  const tilsInRange = cutoffStr
    ? activeTils.filter((t) => t.loggedFor >= cutoffStr)
    : activeTils;

  const tilDischargedAllTime = activeTils.filter((t) => t.dischargesBookmarkId != null).length;
  const tilDischargedInRange = tilsInRange.filter((t) => t.dischargesBookmarkId != null).length;
  const dischargedBookmarkIds = new Set(
    activeTils
      .map((t) => t.dischargesBookmarkId)
      .filter((id): id is number => id != null)
  );

  const tilTypeMap = new Map<TilType, number>();
  for (const tt of tilTypeValues) tilTypeMap.set(tt, 0);
  for (const t of tilsInRange) {
    tilTypeMap.set(t.type, (tilTypeMap.get(t.type) ?? 0) + 1);
  }
  const tilTypes: TilTypeStatRow[] = Array.from(tilTypeMap.entries())
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      count,
      pct: tilsInRange.length > 0 ? Math.round((count / tilsInRange.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 8-week flow buckets ending on todayStr (8 rolling 7-day weeks: [today-55..today-49] ... [today-6..today]).
  const WINDOW_WEEKS = 8;
  const weeklyFlow: WeeklyFlowPoint[] = [];
  for (let w = WINDOW_WEEKS - 1; w >= 0; w--) {
    const start = addDays(todayStr, -(w * 7 + 6));
    const end = addDays(todayStr, -(w * 7));
    weeklyFlow.push({
      weekStart: start,
      label: formatWeekLabel(start),
      saved: 0,
      cleared: 0,
      reaches: 0,
      tils: 0,
    });
    void end;
  }

  const bucketIndexForDate = (dayStr: string): number => {
    const earliest = weeklyFlow[0].weekStart;
    if (dayStr < earliest || dayStr > todayStr) return -1;
    const [ey, em, ed] = earliest.split("-").map(Number);
    const [dy, dm, dd] = dayStr.split("-").map(Number);
    const diffDays = Math.floor(
      (Date.UTC(dy, dm - 1, dd) - Date.UTC(ey, em - 1, ed)) / MS_PER_DAY
    );
    const idx = Math.floor(diffDays / 7);
    return idx >= 0 && idx < WINDOW_WEEKS ? idx : -1;
  };

  for (const b of topBookmarks) {
    const createdDay = getLoggedForDate(timezone, b.createdAt);
    const cIdx = bucketIndexForDate(createdDay);
    if (cIdx >= 0) weeklyFlow[cIdx].saved++;

    if (!b.unread) {
      const clearedDay = getLoggedForDate(timezone, b.updatedAt);
      const rIdx = bucketIndexForDate(clearedDay);
      if (rIdx >= 0) weeklyFlow[rIdx].cleared++;
    }
  }

  for (const ev of input.useEvents) {
    const evDay = getLoggedForDate(timezone, ev.usedAt);
    const idx = bucketIndexForDate(evDay);
    if (idx >= 0) weeklyFlow[idx].reaches++;
  }

  for (const t of activeTils) {
    const idx = bucketIndexForDate(t.loggedFor);
    if (idx >= 0) weeklyFlow[idx].tils++;
  }

  const totalSaved8w = weeklyFlow.reduce((sum, w) => sum + w.saved, 0);
  const totalCleared8w = weeklyFlow.reduce((sum, w) => sum + w.cleared, 0);
  const totalTils8w = weeklyFlow.reduce((sum, w) => sum + w.tils, 0);

  const avgSavedPerWeek = Number((totalSaved8w / WINDOW_WEEKS).toFixed(1));
  const avgClearedPerWeek = Number((totalCleared8w / WINDOW_WEEKS).toFixed(1));
  const avgTilPerWeek = Number((totalTils8w / WINDOW_WEEKS).toFixed(1));

  const velocity = computeVelocityProjection({
    unreadCount,
    avgSavedPerWeek,
    avgClearedPerWeek,
    avgTilPerWeek,
    windowWeeks: WINDOW_WEEKS,
  });

  // 14-week (98-day) daily activity grid ending todayStr.
  const GRID_DAYS = 98;
  const activityMap = new Map<string, ActivityDayPoint>();
  const activityDays: ActivityDayPoint[] = [];
  for (let i = GRID_DAYS - 1; i >= 0; i--) {
    const date = addDays(todayStr, -i);
    const point: ActivityDayPoint = { date, tils: 0, reaches: 0, total: 0 };
    activityMap.set(date, point);
    activityDays.push(point);
  }

  for (const t of activeTils) {
    const cell = activityMap.get(t.loggedFor);
    if (cell) {
      cell.tils++;
      cell.total++;
    }
  }

  for (const ev of input.useEvents) {
    const day = getLoggedForDate(timezone, ev.usedAt);
    const cell = activityMap.get(day);
    if (cell) {
      cell.reaches++;
      cell.total++;
    }
  }

  return {
    range: input.range,
    timezone,
    generatedAt: now.toISOString(),
    library: {
      total,
      queuedCount,
      referenceCount,
      addedInRange,
      readCount,
      unreadCount,
      unreadQueuedCount,
      unreadReferenceCount,
      readPercent,
      totalMins,
      readMins,
      unreadMins,
      unreadQueuedMins,
    },
    engagement: {
      openedCount,
      neverOpenedCount,
      neverOpenedPct,
      totalReaches,
      reachesInRange,
    },
    synthesis: {
      tilTotal: activeTils.length,
      tilInRange: tilsInRange.length,
      tilDischargedInRange,
      tilDischargedAllTime,
      dischargeRateInRange:
        tilsInRange.length > 0
          ? Math.round((tilDischargedInRange / tilsInRange.length) * 100)
          : 0,
      dischargeRateAllTime:
        activeTils.length > 0
          ? Math.round((tilDischargedAllTime / activeTils.length) * 100)
          : 0,
      dischargedBookmarksCount: dischargedBookmarkIds.size,
      streak: input.streak,
      tilTypes,
    },
    velocity,
    weeklyFlow,
    activityDays,
    notebooks: input.notebooks,
    reading: input.reading,
    output: input.output,
    kinds,
    collections,
    topSources,
    coldestItems,
  };
}
