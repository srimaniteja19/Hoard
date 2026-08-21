import type { KindType, ContextType } from "@/types";
import type { TodoEnergy } from "@/db/schema";

export type SourceKind = "bookmark" | "todo";

/** A candidate for the lead story / up-next rail. Scoring itself is Phase 5. */
export type LeadCandidate = {
  source: SourceKind;
  id: string; // bookmark ids are numeric in the DB; stringified here for a uniform key
  title: string;
  estimatedMinutes: number;
  kind: KindType | null; // bookmarks only
  energy: TodoEnergy | null; // todos only
  overdueDays: number | null; // todos only, null if not overdue
  dueToday: boolean;
  rolloverCount: number | null; // todos only
  ageDays: number; // days since createdAt
  unread: boolean | null; // bookmarks only
};

export type ColumnEntry = {
  id: string;
  title: string;
  meta: string; // short pre-formatted line, e.g. "12 min · overdue 3d"
};

export type TickerItem = {
  label: string;
  value: string;
  delta?: string;
  dir: "up" | "down" | "flat";
};

export type DayBlock = {
  start: string; // "HH:mm", user-local
  end: string;
  title: string;
};

export type RecallCard = {
  id: string;
  hash: string;
  text: string;
  ageDays: number;
  confidence: number;
} | null;

export type ResurfaceItem = {
  id: number;
  title: string;
  url: string;
  useCount: number;
  idleDays: number;
};

export type HomeEdition = {
  masthead: {
    savedTotal: number;
    unread: number;
    openTodos: number;
    tilStreak: number;
    netDebtHours: number;
    freeMinutesToday: number;
  };
  ticker: TickerItem[];
  candidates: LeadCandidate[];
  queue: {
    unread: number;
    owedMinutes: number;
    addedThisWeek: number;
    burndownMonths: number | null;
    entries: ColumnEntry[];
  };
  agenda: {
    open: number;
    workMinutes: number;
    doneToday: number;
    staleCount: number;
    entries: ColumnEntry[];
  };
  record: {
    streak: number;
    monthCount: number;
    dischargeRate: number;
    last14: number[];
    entries: ColumnEntry[];
  };
  ledger: {
    tookOnHours: number;
    clearedHours: number;
    learnedCount: number;
    netHours: number;
    ratio: number | null;
    dischargeRate: number;
    estimateError: number | null;
  };
  day: {
    blocks: DayBlock[];
    nowPercent: number;
    freeMinutes: number;
    unfittedCount: number;
    unfittedMinutes: number;
  };
  recall: RecallCard;
  resurface: ResurfaceItem[];
};

export type HomeEditionParams = {
  minutes: number;
  context: ContextType;
};

/** The subset of HomeEdition that's cacheable for the day (everything but `candidates`). */
export type CachedHomeSections = Omit<HomeEdition, "candidates">;
