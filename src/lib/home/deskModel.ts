import { parseCoverData, type CoverData } from "@/lib/cover-data";
import type { KindType } from "@/types";

export const REACH_WINDOW_DAYS = 60;
export const REACH_TICKS = 8;
const MS_PER_DAY = 86_400_000;

export type DeskShelf = {
  id: string;
  name: string;
  count: number;
  color: string;
  unfiled: boolean;
};

export type DeskResumeItem = {
  id: number;
  title: string;
  collection: string;
  crumb: string;
  href: string;
  sessions: number;
};

export type DeskReachedItem = {
  id: number;
  title: string;
  url: string;
  kind: KindType;
  collection: string;
  reachCount: number;
  wear: number;
  ticksFilled: number;
};

export type DeskColdItem = {
  id: number;
  title: string;
  month: string;
  href: string;
};

export type DeskTilItem = {
  id: string;
  body: string;
  when: string;
};

export type HomeDesk = {
  folio: {
    dateLabel: string;
    savedTotal: number;
    shelfCount: number;
    neverOpened: number;
  };
  shelves: DeskShelf[];
  pickedUp: DeskResumeItem[];
  mostReached: DeskReachedItem[];
  recall: {
    id: string;
    hash: string;
    text: string;
    confidence: number;
  } | null;
  tilRecent: DeskTilItem[];
  coldShelf: {
    count: number;
    percent: number;
    items: DeskColdItem[];
  };
  counters: {
    inLibrary: number;
    addedThisWeek: number;
    reachedFor: number;
    reachedThisWeek: number;
    neverOpened: number;
    neverOpenedPct: number;
    tilStreak: number;
    last14: number[];
  };
};

const UNFILED_NAMES = new Set(["unsorted", "unfiled", "inbox"]);

export function isUnfiledCollection(id: string, name: string): boolean {
  const slug = id.split("-").pop()?.toLowerCase() ?? "";
  return UNFILED_NAMES.has(slug) || UNFILED_NAMES.has(name.trim().toLowerCase());
}

export function shelfDisplayName(name: string, unfiled: boolean): string {
  return unfiled ? "UNFILED" : name;
}

/** Width/height in px. Both scale with count relative to the fullest shelf. */
export function spineSize(count: number, maxCount: number): { width: number; height: number } {
  const t = maxCount > 0 ? Math.min(1, count / maxCount) : 0;
  return {
    width: Math.round(28 + t * 36),
    height: Math.round(78 + t * 92),
  };
}

export function wearFromCounts(counts: number[]): number[] {
  const max = Math.max(0, ...counts);
  if (max <= 0) return counts.map(() => 0);
  return counts.map((count) => Math.min(1, count / max));
}

export function ticksFilled(wear: number, ticks = REACH_TICKS): number {
  if (wear <= 0) return 0;
  return Math.max(1, Math.round(Math.min(1, wear) * ticks));
}

export function formatResumeLeftAt(point: string): string {
  const trimmed = point.trim();
  if (!trimmed) return "";
  return `left at '${trimmed}'`;
}

function chapterLabel(cover: Extract<CoverData, { kind: "VIDEO" }>): string | null {
  const next = cover.chapterOffsets.findIndex((offset) => offset > cover.watchedFraction);
  if (next < 0) return `${Math.round(cover.watchedFraction * 100)}%`;
  return `chapter ${next + 1}`;
}

export function resumePoint(input: {
  extra?: unknown;
  chapterIndex?: number | null;
  startTimeSec?: number | null;
  chapterTitle?: string | null;
}): string | null {
  const extra =
    input.extra && typeof input.extra === "object"
      ? (input.extra as Record<string, unknown>)
      : {};
  const cover = parseCoverData(extra.coverData);

  if (cover?.kind === "VIDEO" && cover.watchedFraction > 0 && cover.watchedFraction < 1) {
    return chapterLabel(cover);
  }
  if (cover?.kind === "ARTICLE" && cover.scrollFraction > 0 && cover.scrollFraction < 1) {
    return `${Math.round(cover.scrollFraction * 100)}%`;
  }
  if (cover?.kind === "PAPER" && cover.pagesRead > 0 && cover.pagesRead < cover.pages) {
    return `page ${cover.pagesRead}`;
  }
  if (cover?.kind === "DOC" && cover.activeIndex > 0) {
    return cover.siblings[cover.activeIndex] ?? `section ${cover.activeIndex + 1}`;
  }
  if (input.chapterTitle?.trim()) return input.chapterTitle.trim();
  if (input.chapterIndex != null && input.chapterIndex >= 0) {
    return `chapter ${input.chapterIndex + 1}`;
  }
  if (input.startTimeSec != null && input.startTimeSec > 0) {
    const mins = Math.floor(input.startTimeSec / 60);
    const secs = input.startTimeSec % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  return null;
}

export function resumeCrumb(collection: string, point: string, sessions: number): string {
  const left = formatResumeLeftAt(point);
  const sessionBit =
    sessions <= 0 ? null : sessions === 1 ? "1 session in" : `${sessions} sessions in`;
  return [collection, left, sessionBit].filter(Boolean).join(" · ");
}

export type ReachCandidate = {
  id: number;
  reach60: number;
  lastUsedAt: Date | null;
  useCount: number;
};

/**
 * Rank by uses inside the window. All-time useCount never decides the order —
 * that's how the same five items pin themselves. Empty window counts fall back
 * to recency among items actually used in the window, not lifetime totals.
 */
export function rankReached<T extends ReachCandidate>(
  items: T[],
  now: Date,
  windowDays = REACH_WINDOW_DAYS,
  limit = 5,
): T[] {
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  const inWindow = items.filter((item) => {
    if (item.reach60 > 0) return true;
    return item.lastUsedAt != null && item.lastUsedAt.getTime() >= cutoff;
  });
  const hasWindowCounts = inWindow.some((item) => item.reach60 > 0);
  const ranked = [...inWindow].sort((a, b) => {
    if (hasWindowCounts && a.reach60 !== b.reach60) return b.reach60 - a.reach60;
    const aAt = a.lastUsedAt?.getTime() ?? 0;
    const bAt = b.lastUsedAt?.getTime() ?? 0;
    if (aAt !== bAt) return bAt - aAt;
    return a.id - b.id;
  });
  return ranked.slice(0, limit);
}

export function displayedReach(item: ReachCandidate): number {
  return item.reach60 > 0 ? item.reach60 : item.useCount;
}

export function kindChip(kind: KindType): { label: string; tone: string } {
  switch (kind) {
    case "DOC":
      return { label: "DOC", tone: "doc" };
    case "GIT":
      return { label: "REPO", tone: "git" };
    case "VID":
      return { label: "VIDEO", tone: "vid" };
    case "ART":
      return { label: "ARTICLE", tone: "art" };
    case "PLY":
      return { label: "PLAYLIST", tone: "ply" };
    case "PPR":
      return { label: "PAPER", tone: "ppr" };
    case "APP":
      return { label: "APP", tone: "app" };
  }
}

export function formatFolioDate(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone,
    })
      .format(now)
      .toUpperCase();
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
      .format(now)
      .toUpperCase();
  }
}

export function formatSaveMonth(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "long", timeZone })
      .format(date)
      .toUpperCase();
  } catch {
    return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date).toUpperCase();
  }
}

export function tilWhenLabel(loggedFor: string, today: string, yesterday: string): string {
  if (loggedFor === today) return "TODAY";
  if (loggedFor === yesterday) return "YESTERDAY";
  return loggedFor;
}

const SPINE_FALLBACKS = ["#B6FF3C", "#00E58A", "#00F0FF", "#FF007A", "#FFE600", "#7C4DFF"];

export function spineColor(color: string | null | undefined, index: number): string {
  if (color && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color;
  return SPINE_FALLBACKS[index % SPINE_FALLBACKS.length];
}
