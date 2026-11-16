import type { KindType } from "@/types";
import type { TilType } from "@/db/schema";

export type StatsRange = "30d" | "90d" | "all";

export interface WeeklyFlowPoint {
  weekStart: string; // YYYY-MM-DD
  label: string; // e.g. "Oct 05"
  saved: number;
  cleared: number;
  reaches: number;
  tils: number;
}

export interface ActivityDayPoint {
  date: string; // YYYY-MM-DD
  tils: number;
  reaches: number;
  total: number;
}

export type VelocityStatus = "clear" | "shrinking" | "growing" | "stalled";

export interface VelocityProjection {
  avgSavedPerWeek: number;
  avgClearedPerWeek: number;
  avgTilPerWeek: number;
  netWeeklyBurn: number; // cleared - saved
  weeksToClearAtNet: number | null;
  weeksToClearSolo: number | null;
  status: VelocityStatus;
  headline: string;
  detail: string;
}

export interface KindStatRow {
  kind: KindType;
  name: string;
  total: number;
  unread: number;
  neverOpened: number;
  totalMins: number;
  unreadMins: number;
  pct: number;
}

export interface CollectionStatRow {
  id: string;
  name: string;
  color: string;
  total: number;
  unread: number;
  neverOpened: number;
  totalMins: number;
  pct: number;
  isUnfiled: boolean;
}

export interface TilTypeStatRow {
  type: TilType;
  count: number;
  pct: number;
}

export interface SourceStatRow {
  domain: string;
  total: number;
  unread: number;
  reaches: number;
}

export interface ColdItemRow {
  id: number;
  title: string;
  kind: KindType;
  source: string;
  mins: number;
  savedOn: string;
}

export interface StatsOverview {
  range: StatsRange;
  timezone: string;
  generatedAt: string;

  library: {
    total: number;
    queuedCount: number;
    referenceCount: number;
    addedInRange: number;
    readCount: number;
    unreadCount: number;
    unreadQueuedCount: number;
    unreadReferenceCount: number;
    readPercent: number;
    totalMins: number;
    readMins: number;
    unreadMins: number;
    unreadQueuedMins: number;
  };

  engagement: {
    openedCount: number;
    neverOpenedCount: number;
    neverOpenedPct: number;
    totalReaches: number;
    reachesInRange: number;
  };

  synthesis: {
    tilTotal: number;
    tilInRange: number;
    tilDischargedInRange: number;
    tilDischargedAllTime: number;
    dischargeRateInRange: number;
    dischargeRateAllTime: number;
    dischargedBookmarksCount: number;
    streak: {
      currentStreak: number;
      longestStreak: number;
      streakAtRisk: boolean;
      skipsUsedThisMonth: number;
    };
    tilTypes: TilTypeStatRow[];
  };

  velocity: VelocityProjection;
  weeklyFlow: WeeklyFlowPoint[];
  activityDays: ActivityDayPoint[];

  notebooks: {
    courses: number;
    lessons: number;
    writtenLessons: number;
    stubLessons: number;
    watchedUnwrittenLessons: number;
    unstartedLessons: number;
    totalWords: number;
    collisions: number;
  };

  reading: {
    booksTotal: number;
    booksReading: number;
    booksCompleted: number;
    marginaliaCount: number;
    marginaliaPromotedCount: number;
  };

  output: {
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
  };

  kinds: KindStatRow[];
  collections: CollectionStatRow[];
  topSources: SourceStatRow[];
  coldestItems: ColdItemRow[];
}
